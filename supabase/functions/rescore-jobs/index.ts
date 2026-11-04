// Re-scores imported jobs that are still pending or rejected with the current
// AI prompt, and files each one by its new verdict: reject -> rejected,
// accept / borderline -> pending. Use it after changing the prompt or the
// rules, or to bring an older queue in line.
//
//   curl -X POST "$SUPABASE_URL/functions/v1/rescore-jobs" \
//        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
//        -d '{"limit": 100, "after": "<next from the previous call>"}'
//
// Each call handles one page ordered by id and returns "next"; repeat with
// "after": next until it is null. Optional "dryRun": true reports without
// writing. Only auto-imported jobs are touched, never published ones, and never
// a job an admin acted on by hand (approved_by_admin is set). If the AI call
// fails for a job, that job is left exactly as it was.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { autoRejects, scoreRelevance } from '../_shared/ingest.ts';
import { isAuthorized } from '../_shared/auth.ts';
import {
  DEFAULT_MODEL,
  mapWithConcurrency,
  scoreWithLlm,
  type MessagesClient,
} from '../_shared/llm.ts';

const CONCURRENCY = 5;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

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

  let body: { limit?: number; after?: string; dryRun?: boolean } = {};
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
  const model = Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL;

  let query = supabase
    .from('jobs')
    .select(
      'id, title, institution, description, posted_at, application_deadline, approval_status',
    )
    .eq('is_auto_imported', true)
    .in('approval_status', ['pending', 'rejected'])
    .is('approved_by_admin', null)
    .order('id', { ascending: true })
    .limit(limit);
  if (body.after) query = query.gt('id', body.after);

  const { data: jobs, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const counts = {
    checked: jobs?.length ?? 0,
    aiScored: 0,
    keywordExcluded: 0,
    aiFailed: 0,
    movedToRejected: 0,
    restoredToPending: 0,
    verdicts: { accept: 0, borderline: 0, reject: 0, none: 0 },
  };
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  await mapWithConcurrency(jobs ?? [], CONCURRENCY, async (job) => {
    const keyword = scoreRelevance(job.title, job.description ?? '');
    let update: Record<string, unknown>;
    let verdict: 'accept' | 'borderline' | 'reject' | null = null;
    let reasoning: string;

    if (keyword.reasoning.startsWith('excluded')) {
      counts.keywordExcluded++;
      reasoning = keyword.reasoning;
      update = {
        relevance_score: keyword.score,
        relevance_reasoning: reasoning,
        relevance_verdict: null,
      };
    } else {
      const scored = await scoreWithLlm(client, {
        title: job.title,
        institution: job.institution,
        description: job.description ?? '',
        posted_at: job.posted_at,
      }, model, today);
      if (!scored) {
        counts.aiFailed++; // leave this job exactly as it was
        return;
      }
      counts.aiScored++;
      verdict = scored.verdict;
      reasoning = `AI: ${scored.reasoning}`;
      update = {
        relevance_score: keyword.score,
        relevance_reasoning: reasoning,
        relevance_verdict: verdict,
      };
      if (!job.application_deadline && scored.deadline) {
        update.application_deadline = scored.deadline;
      }
    }
    counts.verdicts[verdict ?? 'none']++;

    const target = autoRejects({
        relevance_reasoning: reasoning,
        relevance_verdict: verdict,
      })
      ? 'rejected'
      : 'pending';
    if (target !== job.approval_status) {
      update.approval_status = target;
      if (target === 'rejected') counts.movedToRejected++;
      else counts.restoredToPending++;
    }

    if (dryRun) return;
    const { error: updateError } = await supabase.from('jobs').update(update)
      .eq('id', job.id).eq('approval_status', job.approval_status);
    if (updateError) errors.push(`${job.title}: ${updateError.message}`);
  });

  const last = jobs?.[jobs.length - 1]?.id ?? null;
  return json({
    dryRun,
    ...counts,
    errors,
    next: counts.checked === limit ? last : null,
  });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
