// Organises published job postings into labelled sections and key fields.
//
// Called by the scheduler every 15 minutes (see 20260813000000), or for one job
// by an admin's "Organise now" button. It never changes a job's description:
// the result goes in jobs.structured, and the page falls back to the original
// text for any job that has none.
//
//   curl -X POST "$SUPABASE_URL/functions/v1/structure-jobs" \
//        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
//        -d '{"limit": 20}'
//
// Body (all optional): {"limit": 20, "jobId": "<uuid>", "dryRun": true}
//   limit  - how many unorganised published jobs to take (default 20, max 50)
//   jobId  - organise just this job, whatever its state
//   dryRun - run the model and report, but write nothing
//
// A job the model could not read is marked structure_failed_at and tried again
// after 6 hours, so one bad posting cannot make every run call the model again.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { isAuthorized } from '../_shared/auth.ts';
import { mapWithConcurrency, type MessagesClient } from '../_shared/llm.ts';
import { STRUCTURE_MODEL, structureJob } from '../_shared/structure.ts';

const CONCURRENCY = 4;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RETRY_AFTER_HOURS = 6;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (
    !isAuthorized(req.headers.get('Authorization'), {
      serviceKey,
      schedulerSecret: Deno.env.get('SCHEDULER_SECRET') ?? '',
    })
  ) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 400);

  let body: { limit?: number; jobId?: string; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine.
  }
  const dryRun = body.dryRun === true;
  const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const client = new Anthropic({ apiKey }) as unknown as MessagesClient;
  const model = Deno.env.get('ANTHROPIC_MODEL') || STRUCTURE_MODEL;

  let query = supabase
    .from('jobs')
    .select('id, title, institution, description, updated_at');
  if (body.jobId) {
    query = query.eq('id', body.jobId);
  } else {
    const retryCutoff = new Date(Date.now() - RETRY_AFTER_HOURS * 3600000).toISOString();
    query = query
      .eq('approval_status', 'approved')
      .eq('is_published', true)
      .eq('job_status', 'active')
      .is('structured_at', null)
      .or(`structure_failed_at.is.null,structure_failed_at.lt.${retryCutoff}`)
      .order('updated_at', { ascending: false })
      .limit(limit);
  }

  const { data: jobs, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const counts = { checked: jobs?.length ?? 0, organised: 0, failed: 0, inputTokens: 0, outputTokens: 0 };
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  await mapWithConcurrency(jobs ?? [], CONCURRENCY, async (job) => {
    const result = await structureJob(client, {
      title: job.title,
      institution: job.institution,
      description: job.description ?? '',
    }, model, today);

    // Only write if the job has not been edited since it was read, so an
    // organised copy of an old description never lands on a new one.
    const patch = result
      ? {
        structured: result.job,
        structured_at: new Date().toISOString(),
        structure_failed_at: null,
      }
      : { structure_failed_at: new Date().toISOString() };

    if (result) {
      counts.organised++;
      counts.inputTokens += result.usage?.input_tokens ?? 0;
      counts.outputTokens += result.usage?.output_tokens ?? 0;
    } else {
      counts.failed++;
    }
    if (dryRun) return;

    const { error: updateError } = await supabase.from('jobs').update(patch)
      .eq('id', job.id).eq('updated_at', job.updated_at);
    if (updateError) errors.push(`${job.title}: ${updateError.message}`);
  });

  return json({ dryRun, ...counts, errors });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
