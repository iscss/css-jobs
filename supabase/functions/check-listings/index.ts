// Listing liveness sweep.
//
// Re-checks stored jobs' source links and takes dead or closed postings out of
// the review queue and off the public board.
//   - Pending jobs that are dead or closed are deleted: a closed posting has
//     no value to keep, and feeds only list open roles so it will not come back.
//   - Published jobs that are dead, closed, or past their stated deadline are
//     set to job_status 'filled'. The public board only shows 'active' jobs,
//     so they disappear from it at once. They are NOT deleted here: the
//     nightly purge_expired_jobs() deletes a hidden dead or closed job 3 days
//     later, which gives an admin a window to reactivate a wrongly flagged one
//     from the Job Management tab. Taking a job down is the only public-facing
//     change this function ever makes; it never publishes.
//   - A job whose link cannot be read (blocked, timeout) is left alone.
// Hand-posted jobs have no source_url, so their application_url is checked
// instead (when it is an http link).
//
// Invoke:
//   curl -X POST "$SUPABASE_URL/functions/v1/check-listings" \
//        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
// Optional body: {"limit": 100, "dryRun": true, "recheckDays": 7,
//                 "publishedRecheckDays": 3}
// Each call checks the least recently checked jobs first, so repeat the call
// until "remaining" is 0.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { checkListing, type LinkStatus } from '../_shared/liveness.ts';
import { mapWithConcurrency } from '../_shared/llm.ts';

const CONCURRENCY = 2;
const PAUSE_MS = 300; // be a polite guest on other people's sites
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: {
    limit?: number;
    dryRun?: boolean;
    recheckDays?: number;
    publishedRecheckDays?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine.
  }
  const dryRun = body.dryRun === true;
  const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const recheckDays = Number(body.recheckDays) || 7;
  const cutoff = new Date(Date.now() - recheckDays * 86400000).toISOString();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // A stored deadline already removes a job from the public site on the day
  // it passes, so the link check is only a backup for early closures. Published
  // jobs are rechecked every few days, pending ones weekly.
  const publishedDays = Number(body.publishedRecheckDays) || 3;
  const publishedCutoff = new Date(Date.now() - publishedDays * 86400000)
    .toISOString();
  const due = (q: any, kind: 'published' | 'pending') =>
    kind === 'published'
      ? q
        .eq('approval_status', 'approved')
        .eq('job_status', 'active')
        .or(`link_checked_at.is.null,link_checked_at.lt.${publishedCutoff}`)
      : q
        .eq('approval_status', 'pending')
        .or(`link_checked_at.is.null,link_checked_at.lt.${cutoff}`);

  const columns =
    'id, title, source_url, application_url, application_deadline, approval_status';
  const fetchDue = async (kind: 'published' | 'pending', n: number) => {
    if (n <= 0) return [];
    const { data, error } = await due(
      supabase
        .from('jobs')
        .select(columns)
        .or('source_url.not.is.null,application_url.not.is.null')
        .order('link_checked_at', { ascending: true, nullsFirst: true })
        .limit(n),
      kind,
    );
    if (error) throw new Error(error.message);
    return data ?? [];
  };

  let jobs: any[];
  try {
    const published = await fetchDue('published', limit);
    jobs = [...published, ...(await fetchDue('pending', limit - published.length))];
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const counts: Record<LinkStatus, number> = {
    live: 0,
    dead: 0,
    closed: 0,
    unknown: 0,
  };
  let deleted = 0;
  const deactivated: { title: string; reason: string }[] = [];
  const errors: string[] = [];
  const examples: { title: string; status: string; reason: string }[] = [];

  const today = new Date().toISOString().slice(0, 10);

  await mapWithConcurrency(jobs, CONCURRENCY, async (job) => {
    const url = /^https?:\/\//i.test(job.source_url ?? '')
      ? job.source_url
      : /^https?:\/\//i.test(job.application_url ?? '')
      ? job.application_url
      : null;

    let result = url
      ? await checkListing(url)
      : { status: 'unknown' as LinkStatus, reason: 'no http link to check' };

    // A deadline that has passed is a hard close, whatever the page says.
    if (job.application_deadline && job.application_deadline < today) {
      result = {
        status: 'closed',
        reason: `deadline passed (${job.application_deadline})`,
      };
    }
    counts[result.status]++;

    if (result.status === 'dead' || result.status === 'closed') {
      if (examples.length < 10) {
        examples.push({
          title: job.title,
          status: result.status,
          reason: result.reason,
        });
      }
    }

    if (!dryRun) {
      const gone = result.status === 'dead' || result.status === 'closed';
      if (gone && job.approval_status === 'pending') {
        const { error: deleteError } = await supabase.from('jobs').delete()
          .eq('id', job.id).eq('approval_status', 'pending');
        if (deleteError) errors.push(`${job.title}: ${deleteError.message}`);
        else deleted++;
      } else if (gone && job.approval_status === 'approved') {
        const { error: updateError } = await supabase.from('jobs').update({
          job_status: 'filled',
          status_updated_at: new Date().toISOString(),
          link_status: result.status,
          link_status_reason: result.reason,
          link_checked_at: new Date().toISOString(),
        }).eq('id', job.id).eq('approval_status', 'approved');
        if (updateError) {
          errors.push(`${job.title}: ${updateError.message}`);
        } else {
          deactivated.push({ title: job.title, reason: result.reason });
        }
      } else {
        const { error: updateError } = await supabase.from('jobs').update({
          link_status: result.status,
          link_status_reason: result.reason,
          link_checked_at: new Date().toISOString(),
        }).eq('id', job.id);
        if (updateError) errors.push(`${job.title}: ${updateError.message}`);
      }
    }
    await sleep(PAUSE_MS);
  });

  const remainingOf = async (kind: 'published' | 'pending') => {
    const { count } = await due(
      supabase.from('jobs').select('id', { count: 'exact', head: true })
        .or('source_url.not.is.null,application_url.not.is.null'),
      kind,
    );
    return count ?? 0;
  };
  const remaining = (await remainingOf('published')) + (await remainingOf('pending'));

  return json({
    dryRun,
    checked: jobs.length,
    counts,
    deleted,
    deactivated,
    errors,
    examples,
    remaining: dryRun ? null : remaining,
  });
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
