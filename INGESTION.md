# Automated Job Ingestion

Pulls academic job postings from external feeds into the admin approval queue.
**Nothing reaches the public site without an admin approving it.**

---

## The safety guarantee

Imported jobs are inserted with `approval_status = 'pending'` and
`is_published = false`. The existing RLS policy

```sql
CREATE POLICY "Anyone can view published jobs" ON public.jobs
  FOR SELECT USING (is_published = true AND approval_status = 'approved');
```

makes those rows unreadable to the public — hidden at the database layer, not
by the UI. A database trigger (`trg_imported_jobs_pending`) forces
pending/unpublished on every auto-imported insert, so even a bug in the
ingestion code cannot publish a job. Verified: with 100 imported jobs in the
database, an anonymous API request returns 0.

---

## Demo runbook

Prerequisites: Docker Desktop running.

```bash
# 1. Start the local stack (~1 min first time)
npx supabase start

# 2. Serve edge functions (leave running in its own terminal)
npx supabase functions serve --no-verify-jwt

# 3. Start the app (leave running in its own terminal)
npm run dev            # http://localhost:8080
```

Sign in at http://localhost:8080/auth with **admin@demo.local** /
**demo123456**, then open http://localhost:8080/admin.

To run an import live during the demo:

```bash
SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

curl -X POST "http://127.0.0.1:54321/functions/v1/ingest-jobs" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Add `"dryRun": true` to the body to fetch and score without inserting — useful
for showing the pipeline without changing the queue.

The response reports `fetched`, `inserted`, `duplicates`, and `skipped` per
source, plus the five highest-scoring listings.

### Suggested demo narrative

1. Show `/admin` — the pending queue, sorted with the most likely CSS jobs first.
2. Run the curl command — a second run inserts 0 and reports 100 duplicates,
   which demonstrates deduplication.
3. Open http://localhost:8080/jobs in a private window — imported jobs are
   **not** there.
4. Approve one job in `/admin`.
5. Refresh the public page — that one job now appears. The rest stay hidden.

### Resetting between rehearsals

```bash
npx supabase db reset     # wipes and reapplies migrations
```

Then recreate the demo admin (the reset clears auth users):

```bash
SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
curl -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"demo123456","email_confirm":true}'

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "UPDATE user_profiles SET is_admin=true, is_approved_poster=true WHERE email='admin@demo.local';"
```

---

## How it works

```
job_sources (table)  →  adapter  →  normalize  →  dedupe  →  insert as pending
                                                                    ↓
                                                          ADMIN REVIEW (human)
                                                                    ↓
                                                        approve → live on /jobs
```

| File | Role |
|------|------|
| `supabase/functions/ingest-jobs/index.ts` | Entry point; loops sources, inserts, logs runs |
| `supabase/functions/_shared/adapters.ts` | Per-feed fetch + parse |
| `supabase/functions/_shared/ingest.ts` | Normalization, constraint validation, scoring, hashing |
| `src/lib/ingest.test.ts` | Unit tests for normalization and scoring (19) |
| `src/lib/adapters.test.ts` | Unit tests for feed parsing (9) |
| `scripts/verify-ingestion.sh` | Database-level safety checks (13) |

---

## Tests

Two layers, because they answer different questions.

### Unit tests — `npx vitest run`

28 tests over the pure functions, with feeds mocked. Fast, no database needed.
They cover entity decoding, HTML stripping, job-type mapping, relevance
scoring, content hashing, constraint validation, and RSS parsing.

Notable cases:

- **Bot-protection pages are treated as failures.** HigherEdJobs returns HTTP
  200 with an Incapsula HTML body; parsing it as RSS would report "0 jobs
  fetched" and look like a quiet day rather than a broken source.
- **`mapJobType` never returns `'RA'`.** That value exists in the old migration
  but not in production, so returning it would fail every insert.
- **Malformed listings are skipped, not thrown.** One bad item must not abort a
  100-item run.

### Safety checks — `./scripts/verify-ingestion.sh`

13 checks against the running local database. These verify the claims that
matter most — what a buggy import or a hostile caller can actually do:

| Check | What it proves |
|-------|----------------|
| Anonymous API returns 0 imported jobs | The public cannot see pending imports |
| Insert claiming `approved`/`published`/`featured` is clamped to pending | The trigger cannot be bypassed, even from SQL |
| Duplicate `source_url` rejected | Re-running an import does not duplicate rows |
| Duplicate `content_hash` under a different URL rejected | Syndicated copies collapse to one |
| Short description, short title, non-http URL, score > 1 all rejected | Database constraints hold |
| Highest-scoring import sorts first; low scorers retained | Ordering works and nothing is discarded |
| Anon key rejected, service role accepted | The ingest endpoint is not publicly callable |

Run it after `npx supabase start` and an import. It cleans up its own test
rows. Useful as a pre-demo smoke test.

### Adding a source

Sources are data, not code — no deploy needed for a feed the existing adapters
can handle:

```sql
INSERT INTO job_sources (slug, name, adapter, feed_url, config) VALUES (
  'stanford',
  'Stanford University',
  'rss-generic',
  'https://example.stanford.edu/jobs/feed',
  '{"institution": "Stanford University", "location": "Stanford, CA"}'::jsonb
);
```

Available adapters: `rss-jobrxiv` (jobRxiv's structured job feed),
`rss-generic` (plain RSS 2.0; institution and location come from `config`).

Pause a source with `UPDATE job_sources SET is_active = false WHERE slug = '…'`.

### Deduplication

Two layers, both enforced by unique indexes:

- `source_url` — the same posting is never imported twice.
- `content_hash` — SHA-256 of normalized `title + institution`, so the same
  role syndicated to several feeds under different URLs still collapses to one.

A duplicate insert returns Postgres error `23505`, which the function counts
rather than treating as a failure.

### Relevance scoring

`scoreRelevance()` in `_shared/ingest.ts` assigns 0.0–1.0 from weighted
keywords. **It only orders the queue — nothing is ever discarded because of a
low score.** Every fetched listing that passes database constraints is
imported and reviewable.

To swap in an LLM scorer later (better ordering, roughly $1–3/month with Claude
Haiku), replace that one function — the rest of the pipeline is unchanged.

---

## Scheduling (automated)

A `pg_cron` job runs ingestion **daily at 03:00 UTC** — no manual trigger
needed. New postings appear in the admin queue each morning, already scored,
with stale and closed listings dropped.

```
cron.job: ingest-jobs-daily   '0 3 * * *'   active
   -> public.run_job_ingestion()
   -> net.http_post(.../functions/v1/ingest-jobs)
```

**Scheduling covers fetching only.** Imported jobs still land as `pending`
and still require an admin to approve them — the `trg_imported_jobs_pending`
trigger is untouched, so automation can never publish to the public site.

### Configuration

The function URL and service role key live in `ingestion_settings` (admin-only,
RLS enabled) rather than in the cron command text, which is readable by anyone
who can query `cron.job`:

```sql
INSERT INTO ingestion_settings (key, value) VALUES
  ('function_url', 'https://<project>.supabase.co/functions/v1/ingest-jobs'),
  ('service_role_key', '<service role key>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Operating it

```sql
-- Run now rather than waiting for 03:00
SELECT public.run_job_ingestion();

-- What happened on recent runs
SELECT source_slug, status, fetched_count, inserted_count, stale_count,
       duplicate_count, error_message
FROM scrape_runs ORDER BY started_at DESC LIMIT 20;

-- Pause / resume the schedule
UPDATE cron.job SET active = false WHERE jobname = 'ingest-jobs-daily';

-- Change the time (e.g. 06:00 UTC)
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'ingest-jobs-daily'),
  schedule := '0 6 * * *'
);
```

A source that starts failing shows up as `status = 'error'` with the message in
`scrape_runs` — check that table rather than assuming a quiet day means no jobs.

---

## Freshness

Feeds differ wildly in how long they keep entries: jobRxiv expires within days,
CoMSES still lists postings from 2021. Two independent signals retire a
listing at ingest:

- **A stated deadline that has passed.** `extractDeadline()` reads phrasings
  like "Application deadline: 15 September 2026" from the description.
- **A posting date older than the source's window**, set per source in
  `job_sources.max_age_days` (NULL disables the check).

A listing with **no date at all is kept** — absence of a date is not evidence
of staleness, and an admin can still judge it.

```sql
-- Tune a source's window without a deploy
UPDATE job_sources SET max_age_days = 365 WHERE slug = 'comses';
```

Current windows: CoMSES 180 days, Workday universities 365, jobRxiv none
(it expires its own entries). Measured effect on CoMSES: 120 fetched,
116 rejected as stale.

The admin card shows an age badge (`3d ago`, `4mo ago`, `1.4y ago`) coloured
amber past 180 days and red past a year, plus a deadline badge when one is
found.

---

## Not yet done
- **More sources.** Only jobRxiv is wired up. See "Sources investigated" below.
- **Bulk actions.** No bulk approve/reject in the admin UI yet; at a few
  hundred pending jobs that becomes worth adding.
- **Deploy.** The function has not been deployed to production:
  `npx supabase functions deploy ingest-jobs`, and the migration needs
  `npx supabase db push`.

---

## Sources investigated

| Source | Status | Notes |
|--------|--------|-------|
| **jobRxiv** | ✅ Working | `https://jobrxiv.org/?feed=job_feed` — real RSS with structured `job_listing:location`, `job_listing:job_type`, `job_listing:company`. `posts_per_page=100` works; `paged` does not. |
| Euraxess | ❌ No read API | Its XML guidelines are for *submitting* jobs to Euraxess. No RSS or JSON export. Would require HTML scraping. |
| HigherEdJobs | ❌ Blocked | Documented category feeds (Sociology `catID=93`, CS `102`, PolSci `90`) return an Imperva/Incapsula bot-protection page instead of RSS. |
| jobs.ac.uk | ⚠️ Feeds moved | `/feeds` 404s and `?format=rss` returns HTML. `robots.txt` is permissive and a sitemap exists (`sitemap0.xml`, ~8k URLs), so a sitemap-based adapter is possible but needs per-page HTML parsing. |
| Nature Careers / AJO | ⚠️ Not RSS | Both return HTML at the URLs tried; needs more investigation. |
| LinkedIn / Indeed | 🚫 Excluded | Scraping prohibited by their terms of service. |

---

## Schema drift found while building this

The migration reconciles three things that had drifted between the repo and
production. All are `IF NOT EXISTS` / conditional, so they are no-ops against
the hosted database — but without them, a database built from this repo alone
does not match production.

1. **`job_type` enum** — migrations create `'RA'`, but production (and the whole
   frontend) uses `'Research Assistant'`. Renamed.
2. **Missing columns** — `submitted_for_approval_at`, `status_updated_at`,
   `status_updated_by`, `notification_sent_at`, `notification_sent_by` exist in
   production and in the generated types but in no migration. Added.
3. **Missing grants** — Supabase's default ACLs only cover tables created by
   `supabase_admin`, but migrations run as `postgres`. Every table in this repo
   lacked `SELECT`/`INSERT`/`UPDATE`/`DELETE` grants for `anon`,
   `authenticated`, and `service_role`; production got them via the dashboard.
   Granted explicitly so a fresh database works.

**Still unreconciled** (production has these, no migration does): the
`email_queue` columns `failed_at`, `failure_reason`, `retry_count`,
`max_retries`; `notification_settings.multiple_reminders`; and a table with
`key`/`value` columns. `src/integrations/supabase/types.ts` was therefore
edited by hand rather than regenerated — **regenerating it from the local
database would delete those production types.** Reconcile them in a follow-up
before running `supabase gen types` again.
