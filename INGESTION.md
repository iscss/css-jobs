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

# 2. Serve edge functions (leave running in its own terminal).
#    For AI scoring, first copy supabase/functions/.env.example to
#    supabase/functions/.env and add your Anthropic key. Without a key the
#    import still works and uses keyword scoring.
npx supabase functions serve --no-verify-jwt --env-file supabase/functions/.env

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
for showing the pipeline without changing the queue. Add `"llm": false` to skip
the AI step, and `"source": "jobrxiv"` to run one source.

The response reports `fetched`, `inserted`, `duplicates`, `skipped` and `stale`
per source, how many jobs the AI scored (`llmScored`) and how many fell back to
keyword scoring (`llmFallback`), plus the five highest-scoring listings.

To remove dead and closed postings, run the link check (see
[Listing liveness](#listing-liveness)). It works in small batches; repeat until
`remaining` is 0:

```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/check-listings" \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{"limit": 60}'
```

### Suggested demo narrative

1. Show `/admin` — the pending queue, sorted with the most likely CSS jobs first,
   each with the AI's one-sentence reason in the score tooltip.
2. Run the curl command — a second run inserts few or no new jobs and reports
   the rest as duplicates, which demonstrates deduplication.
3. Open http://localhost:8080/jobs in a private window — imported jobs are
   **not** there.
4. Approve one job in `/admin`.
5. Refresh the public page — that one job now appears. The rest stay hidden.

### Resetting between rehearsals

```bash
npx supabase db reset     # wipes and reapplies migrations
```

To undo only the approvals made during a rehearsal (keeps imports and rejects):

```sql
UPDATE jobs SET approval_status='pending', is_published=false
WHERE is_auto_imported AND approval_status='approved';
```

Do **not** reset every imported job to pending: that would also bring back the
jobs the cleanup rejected.

After a full `db reset`, recreate the demo admin (the reset clears auth users):

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
job_sources → adapter → normalize → dedupe → keyword pre-filter → AI score
                                                                    ↓
                                                          insert as pending
                                                                    ↓
                                          link check removes dead / closed jobs
                                                                    ↓
                                                          ADMIN REVIEW (human)
                                                                    ↓
                                                        approve → live on /jobs
                                                                    ↓
                              hidden at its deadline, deleted by the nightly purge
```

| File | Role |
|------|------|
| `supabase/functions/ingest-jobs/index.ts` | Entry point; loops sources, drops known jobs, scores new ones, inserts, logs runs |
| `supabase/functions/check-listings/index.ts` | Link check and cleanup of stored jobs |
| `supabase/functions/_shared/adapters.ts` | Per-source fetch + parse (jobRxiv, CoMSES, generic RSS, Workday) |
| `supabase/functions/_shared/ingest.ts` | Normalization, constraint validation, keyword scoring (pre-filter and fallback), hashing |
| `supabase/functions/_shared/llm.ts` | AI relevance scoring and closing-date extraction |
| `supabase/functions/_shared/liveness.ts` | Is a posting still there and still open |
| `src/lib/ingest.test.ts` | Unit tests for normalization and keyword scoring (37) |
| `src/lib/adapters.test.ts` | Unit tests for feed parsing (18) |
| `src/lib/llm.test.ts` | Unit tests for AI scoring, deadline handling and prompts (30) |
| `src/lib/liveness.test.ts` | Unit tests for link classification (18) |
| `scripts/verify-ingestion.sh` | Database-level safety checks (13) |

---

## Tests

Two layers, because they answer different questions.

### Unit tests — `npx vitest run`

103 tests over the pure functions, with feeds and the AI client mocked. Fast,
no database or network needed. They cover entity decoding, HTML stripping,
job-type mapping, keyword scoring, content hashing, constraint validation, feed
parsing, AI reply parsing, deadline validation, and link classification.

Notable cases:

- **Bot-protection pages are treated as failures.** HigherEdJobs returns HTTP
  200 with an Incapsula HTML body; parsing it as RSS would report "0 jobs
  fetched" and look like a quiet day rather than a broken source.
- **`mapJobType` never returns `'RA'`.** That value exists in the old migration
  but not in production, so returning it would fail every insert.
- **Malformed listings are skipped, not thrown.** One bad item must not abort a
  100-item run.
- **Any AI failure falls back to the keyword score.** An API error, refusal or
  unparseable reply never aborts a run.
- **The word "expired" in a stylesheet is not a closed posting.** Link checking
  looks only at visible text, status codes, redirects and structured metadata.
- **A doubtful AI deadline is discarded.** Impossible dates, dates years away
  and review-start dates become null.

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
`rss-comses` (CoMSES Net; institution is recovered from the text),
`rss-generic` (plain RSS 2.0; institution and location come from `config`), and
`workday` (university career sites on Workday; needs `config.institution` and
optional `search_terms`). Adding another Workday university is one row.

Pause a source with `UPDATE job_sources SET is_active = false WHERE slug = '…'`.

### Deduplication

Two layers, both enforced by unique indexes:

- `source_url` — the same posting is never imported twice.
- `content_hash` — SHA-256 of normalized `title + institution`, so the same
  role syndicated to several feeds under different URLs still collapses to one.

A duplicate insert returns Postgres error `23505`, which the function counts
rather than treating as a failure.

### Relevance scoring

Scoring runs in two steps. **It only orders the queue — a score never
publishes anything.**

1. **Keyword pre-filter (free).** `scoreRelevance()` in `_shared/ingest.ts`
   scores obviously unrelated roles (clinical, lab, marketing, administrative)
   as 0. Those skip the AI step. On a random sample, the AI agreed with this
   filter on 98 of 99 jobs.
2. **AI score.** For everything else, `scoreWithLlm()` in `_shared/llm.ts` asks
   an Anthropic Haiku model for a 0-1 CSS relevance score, a one-sentence
   reason, and the application closing date if the posting states one. The
   reason is shown as "AI: ..." in the admin tooltip. Only new jobs are scored:
   jobs already in the database are dropped first, so repeat runs cost almost
   nothing.

Keyword scoring still runs for every job and is the **fallback** if the AI is
unavailable (no key, API error, refusal, or an unreadable reply). The keyword
scoring tables missed real CSS roles in testing (about 3% of its low scores
were rated 0.5 or higher by the AI), so they are only a safety net.

Settings (Supabase secrets, or `supabase/functions/.env` locally):
`ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`, and `MAX_LLM_PER_RUN`
(default 150). The cost is a small fraction of a cent per new job; check real
spend on the Anthropic console.

**Clearing a backlog.** To bring an old, noisy queue down to something
reviewable: run the link check until `remaining` is 0, re-score what is left
with the AI, then reject everything under a threshold (0.2 worked well):

```sql
UPDATE jobs SET approval_status = 'rejected'
WHERE approval_status = 'pending' AND is_auto_imported AND relevance_score < 0.2;
```

Rejected jobs stay in the table, so their URLs still block re-import.

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

**Other scheduled and manual steps**

| Step | When | Notes |
|------|------|-------|
| `ingest-jobs-daily` | 03:00 UTC | Fetch, score, insert as pending |
| `purge-expired-jobs` | 00:05 UTC | Deletes jobs past their deadline, and hidden dead or closed jobs after 3 days |
| `check-listings` | Manual for now | Not yet on a schedule; add a `pg_cron` entry like the ingestion one |

---

## Freshness

Feeds differ wildly in how long they keep entries: jobRxiv expires within days,
CoMSES still lists postings from 2021. Two independent signals retire a
listing at ingest:

- **A stated deadline that has passed.** `extractDeadline()` reads phrasings
  like "Application deadline: 15 September 2026" from the description.
- **A posting date older than the source's window**, set per source in
  `job_sources.max_age_days` (NULL disables the check).

- **A closing date found by the AI.** Most postings state their deadline near
  the end, so the prompt includes short excerpts from around any "deadline" or
  "apply by" wording. A year-less date is resolved from the posting date, and a
  date when review of applications *begins* is ignored. A job whose AI-found
  deadline has already passed is not inserted.

A listing with **no date at all is kept** — absence of a date is not evidence
of staleness, and an admin can still judge it.

```sql
-- Tune a source's window without a deploy
UPDATE job_sources SET max_age_days = 365 WHERE slug = 'comses';
```

Current windows: CoMSES 180 days, Workday universities 365, jobRxiv none
(it expires its own entries). Measured effect on CoMSES: 120 fetched,
116 rejected as stale.

### After import: expiry and deletion

- **Public visibility ends at the deadline.** The read rule on `jobs` requires
  `application_deadline` to be unset or today-or-later (UTC), so a job
  disappears on its own with no polling.
- **Deletion.** `purge_expired_jobs()` runs nightly and deletes jobs past their
  deadline (published or not) plus hidden dead/closed jobs older than 3 days.
  Tags, saved jobs, alert matches and queued emails cascade with the job.
- **Most jobs state no deadline** (about 85% in testing), so they stay until the
  link check finds them closed.

The admin card shows an age badge (`3d ago`, `4mo ago`, `1.4y ago`) coloured
amber past 180 days and red past a year, plus a deadline badge when one is
found.

---

## Listing liveness

`check-listings` re-checks stored jobs' links (`source_url`, or `application_url`
for hand-posted jobs) and classifies each one:

| Result | Meaning | Action |
|--------|---------|--------|
| `live` | Page loads and looks open | Nothing |
| `dead` | HTTP 404/410, or a redirect to the site's homepage | Pending: deleted. Published: hidden (`job_status = 'filled'`), deleted after 3 days |
| `closed` | A past `validThrough` date, a visible "listing has expired" notice, a passed `application_deadline`, or a Workday posting with applications closed | Same as dead |
| `unknown` | Blocked (403/429), server error, or timeout | **Never acted on** |

Workday pages are JavaScript apps that return 200 for anything, so Workday jobs
are checked through the same JSON endpoint the importer uses. The function never
publishes anything; hiding a published job is the only public-facing change it
makes. Published jobs are rechecked every 3 days, pending jobs weekly
(`publishedRecheckDays` and `recheckDays` in the request body). Each call checks
the least recently checked jobs first and is gentle on the sites (two requests
at a time with a short pause), so a large backlog takes a while.

Known gap: some Workday sites return 403 to the check, so those jobs stay
`unknown`.

---

## Not yet done
- **More sources.** jobRxiv, CoMSES and nine Workday university sites are wired
  up (CMU's Workday search currently returns HTTP 422). See "Sources
  investigated" below.
- **Bulk actions.** No bulk approve/reject in the admin UI yet. Rejecting by
  score threshold is done with SQL (see "Clearing a backlog").
- **Schedule the link check** alongside the nightly import.
- **Admin "Inactive" button.** It offers a status the database does not allow
  (`job_status` accepts only `active` and `filled`).
- **Deploy.** None of this is on production yet. It needs
  `npx supabase db push` for the migrations, `npx supabase functions deploy
  ingest-jobs --no-verify-jwt` and `check-listings --no-verify-jwt`, and the
  `ANTHROPIC_API_KEY` secret (see the README).

---

## Sources investigated

| Source | Status | Notes |
|--------|--------|-------|
| **CoMSES Net** | ✅ Working | RSS feed with no structured institution or location fields; institution is recovered from the text. Lists old postings, so it has a 180-day window. |
| **Workday university sites** | ✅ Working | UChicago, Wisconsin, OSU, UW, Cornell, UMD, Brown, UVA via the public JSON search. CMU currently returns HTTP 422. |
| **jobRxiv** | ✅ Working | `https://jobrxiv.org/?feed=job_feed` — real RSS with structured `job_listing:location`, `job_listing:job_type`, `job_listing:company`. `posts_per_page=100` works; `paged` does not. |
| Euraxess | ❌ No read API | Its XML guidelines are for *submitting* jobs to Euraxess. No RSS or JSON export. Would require HTML scraping. |
| HigherEdJobs | ❌ Blocked | Documented category feeds (Sociology `catID=93`, CS `102`, PolSci `90`) return an Imperva/Incapsula bot-protection page instead of RSS. |
| jobs.ac.uk | ⚠️ Feeds moved | `/feeds` 404s and `?format=rss` returns HTML. `robots.txt` is permissive and a sitemap exists (`sitemap0.xml`, ~8k URLs), so a sitemap-based adapter is possible but needs per-page HTML parsing. |
| Nature Careers / AJO | ⚠️ Not RSS | Both return HTML at the URLs tried; needs more investigation. |
| LinkedIn / Indeed | 🚫 Excluded | Scraping prohibited by their terms of service. |

---

## Migrations added by this work

| Migration | What it does |
|-----------|--------------|
| `20260803000000_job_ingestion` | Ingestion columns, `job_sources`, `scrape_runs`, the pending-only trigger, constraints |
| `20260804000000_job_posted_at` | `posted_at` and freshness support |
| `20260805000000_schedule_ingestion` | `ingestion_settings`, `run_job_ingestion()` and the 03:00 UTC cron |
| `20260806000000_listing_liveness` | `link_status`, `link_status_reason`, `link_checked_at` |
| `20260807000000_expire_published_jobs` | Public read rule hides jobs after their deadline |
| `20260808000000_purge_expired_jobs` | Nightly `purge_expired_jobs()` and its cron |

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
