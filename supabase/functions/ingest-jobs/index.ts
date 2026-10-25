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
// Optional body: {"source": "jobrxiv", "dryRun": true, "llm": false}
//
// If ANTHROPIC_API_KEY is set, new listings are scored by Claude Haiku
// (ANTHROPIC_MODEL, default claude-haiku-5-5). Without a key, or with
// "llm": false, or if a call fails, the keyword score is used instead.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import Anthropic from 'npm:@anthropic-ai/sdk';
import { ADAPTERS } from '../_shared/adapters.ts';
import {
  normalizeJob,
  SkippedJobError,
  StaleJobError,
  type NormalizedJob,
} from '../_shared/ingest.ts';
import {
  DEFAULT_MODEL,
  mapWithConcurrency,
  scoreWithLlm,
  type MessagesClient,
} from '../_shared/llm.ts';

const BOT_ID = '00000000-0000-4000-a000-000000000b07';

const LLM_CONCURRENCY = 5;
const DEFAULT_MAX_LLM_PER_RUN = 150;

interface LlmContext {
  client: MessagesClient;
  model: string;
  /** Calls left in this run, shared across sources. */
  remaining: number;
}

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
  llmScored: number;
  llmFallback: number;
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

  let body: { source?: string; dryRun?: boolean; llm?: boolean } = {};
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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
  const llm: LlmContext | null = apiKey && body.llm !== false
    ? {
      client: new Anthropic({ apiKey }) as unknown as MessagesClient,
      model: Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL,
      remaining: Number(
        Deno.env.get('MAX_LLM_PER_RUN') ?? DEFAULT_MAX_LLM_PER_RUN,
      ),
    }
    : null;

  const results: SourceResult[] = [];
  for (const source of sources as SourceRow[]) {
    results.push(await runSource(supabase, source, body.dryRun === true, llm));
  }

  return json({
    ok: results.every((r) => r.status === 'success'),
    dryRun: body.dryRun === true,
    llm: llm ? { model: llm.model, enabled: true } : { enabled: false },
    results,
  });
});

async function runSource(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  source: SourceRow,
  dryRun: boolean,
  llm: LlmContext | null,
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
    llmScored: 0,
    llmFallback: 0,
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

    // Drop listings already in the database before spending anything on them.
    // Daily runs are mostly repeats, so this keeps the model cost near zero.
    const known = new Set<string>();
    for (let i = 0; i < batch.length; i += 50) {
      const urls = batch.slice(i, i + 50).map((j) => j.source_url);
      const { data } = await supabase
        .from('jobs')
        .select('source_url')
        .in('source_url', urls);
      for (const row of data ?? []) known.add(row.source_url);
    }
    const fresh = batch.filter((job) => {
      if (known.has(job.source_url)) {
        result.duplicates++;
        return false;
      }
      return true;
    });

    // Re-score new listings with the model. Keyword-disqualified roles are
    // skipped (nothing to gain), and any failure keeps the keyword score.
    if (llm) {
      const candidates = fresh
        .filter((job) => !job.relevance_reasoning.startsWith('excluded'))
        .slice(0, Math.max(0, llm.remaining));
      llm.remaining -= candidates.length;

      await mapWithConcurrency(candidates, LLM_CONCURRENCY, async (job) => {
        const scored = await scoreWithLlm(llm.client, job, llm.model);
        if (scored) {
          job.relevance_score = scored.score;
          job.relevance_reasoning = `AI: ${scored.reasoning}`;
          // Keep a regex-found deadline if there is one; otherwise store the
          // model's. The public site stops showing the job after this date.
          if (!job.application_deadline && scored.deadline) {
            job.application_deadline = scored.deadline;
          }
          result.llmScored++;
        } else {
          result.llmFallback++;
        }
      });
    }

    // A deadline the model found may show the job has already closed.
    const today = new Date().toISOString().slice(0, 10);
    const open = fresh.filter((job) => {
      if (job.application_deadline && job.application_deadline < today) {
        result.stale++;
        return false;
      }
      return true;
    });

    result.samples = [...open]
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
      for (const job of open) {
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
