// Automated job ingestion.
//
// Fetches each active source, normalizes listings, and inserts them as pending
// jobs owned by the bot account. Nothing published here is publicly visible:
// the trg_imported_jobs_pending trigger forces approval_status='pending' and
// is_published=false, so an admin still approves every posting by hand.
//
// Invoke manually:
//   curl -X POST "$SUPABASE_URL/functions/v1/ingest-jobs" \
//        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
// Optional body: {"source": "jobrxiv", "dryRun": true}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { ADAPTERS } from '../_shared/adapters.ts';
import {
  normalizeJob,
  SkippedJobError,
  StaleJobError,
  type NormalizedJob,
} from '../_shared/ingest.ts';

const BOT_ID = '00000000-0000-4000-a000-000000000b07';

interface SourceRow {
  slug: string;
  name: string;
  adapter: string;
  feed_url: string;
  config: Record<string, unknown>;
  max_age_days: number | null;
}

interface SourceResult {
  source: string;
  status: 'success' | 'error';
  fetched: number;
  inserted: number;
  duplicates: number;
  skipped: number;
  stale: number;
  error?: string;
  samples?: { title: string; institution: string; score: number }[];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Service-role only: this function bypasses RLS, so it must never be
  // reachable with an anon key. verify_jwt is disabled in config.toml because
  // the caller is cron, not a signed-in user.
  const auth = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: { source?: string; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // No body is fine; run every active source.
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let query = supabase
    .from('job_sources')
    .select('slug, name, adapter, feed_url, config, max_age_days')
    .eq('is_active', true);

  if (body.source) query = query.eq('slug', body.source);

  const { data: sources, error: sourcesError } = await query;

  if (sourcesError) {
    return json({ error: `could not load sources: ${sourcesError.message}` }, 500);
  }
  if (!sources?.length) {
    return json({ error: 'no active sources matched' }, 404);
  }

  const results: SourceResult[] = [];
  for (const source of sources as SourceRow[]) {
    results.push(await runSource(supabase, source, body.dryRun === true));
  }

  return json({
    ok: results.every((r) => r.status === 'success'),
    dryRun: body.dryRun === true,
    results,
  });
});

async function runSource(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  source: SourceRow,
  dryRun: boolean,
): Promise<SourceResult> {
  const startedAt = new Date().toISOString();
  const result: SourceResult = {
    source: source.slug,
    status: 'success',
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    skipped: 0,
    stale: 0,
  };

  try {
    const adapter = ADAPTERS[source.adapter];
    if (!adapter) throw new Error(`unknown adapter "${source.adapter}"`);

    const rawJobs = await adapter(source.feed_url, source.config ?? {});
    result.fetched = rawJobs.length;

    const normalized: NormalizedJob[] = [];
    for (const raw of rawJobs) {
      try {
        normalized.push(
          await normalizeJob(raw, source.slug, BOT_ID, {
            maxAgeDays: source.max_age_days ?? undefined,
          }),
        );
      } catch (error) {
        // Stale and malformed listings are both expected in normal operation;
        // counted separately so a source going stale is visible in the log.
        if (error instanceof StaleJobError) {
          result.stale++;
          continue;
        }
        if (error instanceof SkippedJobError) {
          result.skipped++;
          continue;
        }
        throw error;
      }
    }

    // Collapse duplicates inside this batch before hitting the database, since
    // a single feed can list the same role twice.
    const seen = new Set<string>();
    const batch = normalized.filter((job) => {
      const key = job.content_hash;
      if (seen.has(key)) {
        result.duplicates++;
        return false;
      }
      seen.add(key);
      return true;
    });

    result.samples = [...batch]
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5)
      .map((j) => ({
        title: j.title,
        institution: j.institution,
        score: j.relevance_score,
      }));

    if (!dryRun) {
      // Insert one at a time: a batch insert aborts wholesale on the first
      // duplicate, and duplicates are the expected steady state once a feed
      // has been ingested once.
      for (const job of batch) {
        const { error } = await supabase.from('jobs').insert(job);

        if (!error) {
          result.inserted++;
        } else if (error.code === '23505') {
          result.duplicates++; // unique violation: already imported
        } else {
          throw new Error(`insert failed for "${job.title}": ${error.message}`);
        }
      }

      await supabase
        .from('job_sources')
        .update({
          last_run_at: startedAt,
          last_success_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('slug', source.slug);
    }
  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : String(error);

    if (!dryRun) {
      await supabase
        .from('job_sources')
        .update({ last_run_at: startedAt, last_error: result.error })
        .eq('slug', source.slug);
    }
  }

  if (!dryRun) {
    await supabase.from('scrape_runs').insert({
      source_slug: source.slug,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: result.status,
      fetched_count: result.fetched,
      inserted_count: result.inserted,
      duplicate_count: result.duplicates,
      skipped_count: result.skipped,
      stale_count: result.stale,
      error_message: result.error ?? null,
    });
  }

  return result;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
