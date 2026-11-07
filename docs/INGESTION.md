# Automated job ingestion

How jobs get into the board without anyone typing them in: the nightly import, the AI
verdict, the link check, and the organiser. Part of the [CSS Jobs documentation](../README.md#documentation).

> **Nothing reaches the public site without an admin approving it.**

Related: where the sources are and which to add next is in [SOURCES.md](SOURCES.md); running
and deploying it is in [HANDBOOK.md](HANDBOOK.md#production-setup-one-time) and
[HANDBOOK.md > Operating production](HANDBOOK.md#operating-production).

- [The safety guarantee](#the-safety-guarantee)
- [How it works](#how-it-works)
- [Sources and adapters](#sources-and-adapters)
- [How-to guides](#how-to-guides): add a source, write an adapter, edit the AI prompts, change the keyword filter
- [Deduplication and freshness](#deduplication-and-freshness)
- [The AI verdict](#the-ai-verdict)
- [The link check](#the-link-check)
- [Organised job text](#organised-job-text)
- [Scheduling](#scheduling)
- [Running it by hand](#running-it-by-hand)
- [Tests and safety checks](#tests-and-safety-checks)

---

## The safety guarantee

Imported jobs are inserted as `pending` (or `rejected`, for clear non-matches) and always with
`is_published = false`. The row-level-security policy

```sql
CREATE POLICY "Anyone can view published jobs" ON public.jobs
  FOR SELECT USING (is_published = true AND approval_status = 'approved');
```

makes those rows unreadable to the public, at the database layer and not in the interface. A
database trigger (`trg_imported_jobs_pending`) forces `pending` or `rejected` and unpublished on
every auto-imported insert, so even a bug in the importer cannot publish a job. A
public-API check on production on 2026-11-04 returned only the published jobs.

---

## How it works

```
job_sources -> adapter -> normalise -> dedupe -> keyword pre-filter -> AI verdict
                                                                          |
                                  insert: pending, or rejected if verdict = reject
                                                                          |
                                      link check removes dead / closed jobs
                                                                          |
                                                              ADMIN REVIEW (human)
                                                                          |
                                                            approve -> live on /jobs
                                                                          |
                          organised into sections; hidden at its deadline; purged nightly
```

| File | Role |
|------|------|
| `supabase/functions/ingest-jobs/index.ts` | Entry point: loops sources, drops known jobs, gets verdicts, inserts, logs runs |
| `supabase/functions/check-listings/index.ts` | Link check and clean-up of stored jobs |
| `supabase/functions/rescore-jobs/index.ts` | Re-runs the AI verdict over pending and rejected imports (manual) |
| `supabase/functions/structure-jobs/index.ts` | Organises published jobs into sections |
| `supabase/functions/_shared/adapters.ts` | Per-source fetch and parse (jobRxiv, CoMSES, generic RSS, Workday, Oracle Recruiting) |
| `supabase/functions/_shared/ingest.ts` | Normalisation, HTML stripping, constraint checks, keyword scoring, hashing |
| `supabase/functions/_shared/llm.ts` | The AI verdict, closing-date extraction, and the prompt |
| `supabase/functions/_shared/structure.ts` | The organiser: prompt, quote checking, section slicing |
| `supabase/functions/_shared/liveness.ts` | Is a posting still there and still open, and what to do about it |
| `supabase/functions/_shared/auth.ts` | Who may call the functions (service key or `SCHEDULER_SECRET`) |
| `src/lib/*.test.ts` | Unit tests for all of the above |
| `scripts/verify-ingestion.sh` | Database-level safety checks against the local stack |

---

## Sources and adapters

Sources are rows in `job_sources` (data, not code). The list in use, what each returned on the
first production run, and the boards investigated are in [SOURCES.md](SOURCES.md). The adapters:

| Adapter | For | `config` |
|---------|-----|----------|
| `rss-jobrxiv` | jobRxiv's structured job feed | none |
| `rss-comses` | CoMSES Net (institution is recovered from the text; the feed escapes its HTML twice, which `stripHtml` handles) | none |
| `rss-generic` | Plain RSS 2.0 | `institution`, `location` |
| `workday` | University career sites on Workday (a search, then one request per posting) | `institution` (required); `search_terms`, `max_per_term` |
| `oracle-recruiting` | Career sites on Oracle Recruiting Cloud, such as Stanford (the same search-then-detail pattern, through Oracle's public REST service) | `institution` and `site_number` (required); `search_terms`, `max_per_term` |

The sources the migrations create are in `20260803000000` (jobRxiv), `20260812000000` (CoMSES and the first Workday
universities) and `20260816000000` (the university sources from the lab list).

A source whose `adapter` names something that does not exist is logged as an error and skipped, which is why
sources that still need a reader are registered with `is_active = false`.

Which sources are active, which are registered but inactive, and why each is inactive: [SOURCES.md section 1](SOURCES.md#1-job-sources-the-importer-reads).
Each inactive row says why in its `config.status` and `config.note`.

Request headers identify the importer as `CSSJobsBot/1.0` with a contact address, and it spaces
its requests out. It does not try to get around a site that blocks it (see jobRxiv in
[SOURCES.md](SOURCES.md)). **The fix for a blocked site is to ask the owner to allow `CSSJobsBot`.**

---

## How-to guides

Each guide ends with how to put the change on production. Test locally first (see
[Running it by hand](#running-it-by-hand)); the commands for a production change are collected in
[Apply a change to production](#apply-a-change-to-production).

### Add a source that an existing adapter can read

No deploy is needed. A source is one row in `job_sources`:

| Column | Meaning |
|--------|---------|
| `slug` | Short unique name, used with `{"source": "<slug>"}` and in the logs. Convention: adapter prefix and place, e.g. `wd-upenn` |
| `name` | Shown in the logs |
| `adapter` | One of the adapters above |
| `feed_url` | Must start with `http://` or `https://` (the table enforces it) |
| `config` | The adapter's settings (table above), as JSON |
| `max_age_days` | Ignore postings older than this. Leave empty for feeds that list only open roles. Use 180 to 365 for career sites that keep old postings |
| `is_active` | `false` pauses a source without deleting it |

**A university on Workday.** Open the university's careers site. The address looks like
`https://<tenant>.wd<N>.myworkdayjobs.com/<site>` (or `.../en-US/<site>`). The importer's address is the same host with
`/wday/cxs/<tenant>/<site>/jobs`. Check it before adding it:

```bash
curl -s -X POST 'https://<tenant>.wd<N>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"appliedFacets":{},"limit":5,"offset":0,"searchText":"computational social science"}'
```

A JSON reply with a `total` is a working Workday site. If the careers page looks like something else, open one job and
look at its **Apply** link: Yale's front end is Phenom People, but the apply links go to Workday. A `.../hcmUI/CandidateExperience/...` address
means Oracle Recruiting (use `oracle-recruiting`, `site_number` is the part after `/sites/`). Then:

```sql
INSERT INTO job_sources (slug, name, adapter, feed_url, config, max_age_days) VALUES (
  'wd-example',
  'Example University',
  'workday',
  'https://example.wd1.myworkdayjobs.com/wday/cxs/example/careers/jobs',
  '{"institution": "Example University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
  365
);
```

**An RSS feed** uses `rss-generic`, with `{"institution": "...", "location": "..."}` and the feed's address. **An
Oracle site** uses `oracle-recruiting` with `feed_url` set to the site's root (`https://careersearch.stanford.edu`)
and `"site_number": "stanford"` in `config`.

**Test it before the first real run**, with a dry run that fetches and checks but inserts nothing, then a real run for
that one source, then a look at the result:

```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/ingest-jobs -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" -d '{"source":"wd-example","dryRun":true}'
```

Read `fetched`, `inserted`, `skipped` and the sample listings. If `fetched` is 0, check the address and
search terms. Search terms matter: a Workday site returns only what matches them, which is what keeps a
university's thousands of staff postings out.

**Make it permanent** by putting the row in a new migration file (`supabase/migrations/<later timestamp>_<name>.sql`,
using `INSERT ... ON CONFLICT (slug) DO NOTHING` so it can run twice), as
`20260816000000_seed_university_sources.sql` does, and apply that file to production
([below](#apply-a-change-to-production)). A row typed into the production SQL editor works too, but then a fresh database does
not have it and the next person will not know it exists.

**Pause or remove:** `UPDATE job_sources SET is_active = false WHERE slug = '...'`. The jobs already imported stay.

### Switch on a registered but inactive source

The sources in section 1.2 of [SOURCES.md](SOURCES.md#12-registered-but-inactive) are in the table already. Read the
source's `config.note`:

```sql
SELECT slug, config->>'status' AS status, config->>'note' AS note FROM job_sources WHERE NOT is_active;
```

- **blocked**: ask the owner to allow `CSSJobsBot` (it reads the public careers page once a day and says who it is),
  then check with a dry run. Sites behind a bot challenge (Columbia and UMass Amherst's PageUp) also need a reader.
- **needs-adapter**: [write the adapter](#write-a-new-adapter) first.
- **unverified**: check the address from another network and identify the platform.

When it works: `UPDATE job_sources SET is_active = true, config = config - 'status' - 'note' WHERE slug = '...';`
and set `adapter` to the real one if it was a placeholder.

### Write a new adapter

An adapter is one function: it takes the source's `feed_url` and `config` and returns a list of `RawJob`
(`title`, `institution`, `location`, `description`, `sourceUrl`, and optionally `jobType`, `sourceJobId`,
`applicationUrl`, `postedAt`), defined in `_shared/ingest.ts`. It does **no validation**: `normalizeJob` checks lengths,
strips HTML and maps the job type. Use the Workday and Oracle adapters in `supabase/functions/_shared/adapters.ts` as
the pattern for a site with a search and a detail page. Steps:

1. Find the data, not the page. Look in the browser's Network tab for a JSON or XML service the page calls (that is how
   the Workday, Oracle and Atom readers were found). Check the site's terms and its `robots.txt` first. Where a site refuses
   automated requests, stop and ask the owner; do not work around it.
2. Write the function in `_shared/adapters.ts`. Send the `CSSJobsBot` headers, sleep a few hundred
   milliseconds between requests, **throw a clear error when the response is not OK** (so a failing source shows in
   `scrape_runs` and does not look like a quiet day), and **skip a posting you cannot read instead of throwing**.
3. Register it in the `ADAPTERS` object at the bottom of that file.
4. Add tests in `src/lib/adapters.test.ts`, with the HTTP calls mocked: the mapping, paging, duplicates, a failed detail,
   an empty description, a missing config value and a non-OK reply. `oracleRecruitingAdapter` has eight to copy.
5. **Teach the link check about the site** if its pages are JavaScript apps that answer 200 for anything (check
   with a made-up job id: if it says "live", it is wrong). Add a branch in `checkListing` in `_shared/liveness.ts` that asks
   the site's own data service whether the posting still exists, as the Workday and Oracle branches do, with tests in
   `src/lib/liveness.test.ts`. A job whose link cannot be checked stays `unknown`, which is never acted on.
6. Add the source row ([above](#add-a-source-that-an-existing-adapter-can-read)), run `npx vitest run`, a dry run, then a real
   run, and look at what came in.
7. Deploy `ingest-jobs` and `check-listings` ([below](#apply-a-change-to-production)).

### Edit the AI prompts

There are two prompts, and both treat the posting as data, never as instructions. Keep that sentence when you edit.

| What | Where | Used by |
|------|-------|---------|
| **Does the job fit CSS?** The definition, the three verdicts, the closing-date rules | `SYSTEM_PROMPT` in `supabase/functions/_shared/llm.ts` | `ingest-jobs` (new jobs) and `rescore-jobs` |
| **Organising a posting into sections.** What the model may and may not do | `STRUCTURE_SYSTEM_PROMPT` in `_shared/structure.ts` | `structure-jobs` |
| The model name | `DEFAULT_MODEL` in `llm.ts`, `STRUCTURE_MODEL` in `structure.ts`, or the `ANTHROPIC_MODEL` secret on Supabase to override both without a code change | |
| How many jobs get a verdict per run | `MAX_LLM_PER_RUN` secret (default 150) | `ingest-jobs` |

**Changing what counts as CSS (the usual edit).** Change the definition paragraph and the verdict list in `SYSTEM_PROMPT`.
The reply format (one JSON object with `verdict`, `reasoning`, `deadline`) is parsed by `parseScore`, so change the format only together with that
function and its tests. Keep the rule "when unsure, choose borderline, never reject": it is what stops a good job from being
filed as rejected. The same definition is written in prose at the top of
[The AI verdict](#the-ai-verdict), so update that paragraph too. Then:

1. `npx vitest run` (the prompt tests check that the posting is wrapped in `<posting>` tags and that the format parses).
2. **Try it on real jobs before it goes live.** Locally, run `rescore-jobs` with `"dryRun": true` and read the verdicts
   it would give. A good test set is a dozen jobs you already know: some clear fits, some clear misses, some
   borderline ones.
3. Deploy `ingest-jobs` and `rescore-jobs`, so both use the new prompt.
4. **Re-run the verdict over the queue** so existing jobs follow the new rules: run the link check to completion first
   (hard checks, then the AI), then `rescore-jobs` in pages until `next` is null
   ([Running it by hand](#running-it-by-hand)). It leaves published jobs and anything an admin acted on alone.

**Changing the organiser's prompt.** The organiser may only point at text (quotes and starting positions). If you let the prompt ask for
rewriting, `verifyStructure` will throw those answers away, because every quote is checked against the original. To
see a change on jobs that already have an organised copy, clear it (`UPDATE jobs SET structured = NULL, structured_at = NULL WHERE id = '...'`) and run
`structure-jobs`. Deploy `structure-jobs` after the change.

### Change the keyword filter

The free first step before the AI is `scoreRelevance` in `_shared/ingest.ts`. Its word lists are, in order, `EXPLICIT_FIELD`
(field names that are CSS by definition), `METHOD_SIGNALS`, `SOCIAL_SIGNALS` (a role needs both) and `DISQUALIFYING`
(fields that are never CSS: a match skips the AI and files the job as rejected). Each entry is a regular expression
and a weight. **Be careful adding to `DISQUALIFYING`**, because a match there is the one case where a job is rejected
without the AI looking at it; test the pattern against real titles. The tests are in `src/lib/ingest.test.ts`. The functions
that use it need redeploying, and `rescore-jobs` re-files what is already queued.

### Check that the sources are healthy

Do this after adding a source, after a deploy, and now and then (monthly is plenty).

**1. Did last night's import work?** One row per source per run:

```sql
select source_slug, status, fetched_count, inserted_count, left(error_message, 90) as error, started_at
from scrape_runs order by started_at desc limit 20;
```

(on production, run it in the SQL editor or with `npx supabase db query --remote=ukkqeczgommifgecyrez --read-only "..."`).
A healthy source says `success`. A source that finds nothing is not an error: most days a university has no new CSS posting.
`fetched_count` of 0 for many days in a row on a source that used to find jobs is worth a look.

| Error in the log | Meaning | What to do |
|------------------|---------|------------|
| `HTTP 403` | The site refuses automated requests (jobRxiv does this to Supabase's servers) | Ask the owner to allow `CSSJobsBot`. Do not try to get around it |
| `HTTP 429` | Rate limited | Normally clears by itself the next day. If it persists, add search terms or lower `max_per_term` so fewer requests are made |
| `did not return JSON (got text/html ...)` | The site answered with a web page: a **maintenance window** or a **bot check**. Workday goes down for maintenance on some weekends, and every Workday source fails together | If all Workday sources fail on the same night, wait: the next night's run is normal. If one source fails for days, run its dry run and open its address |
| `Workday search returned HTTP 422` | The search address or its settings are wrong for that tenant (Carnegie Mellon does this) | Re-check the `feed_url` as in [the Workday steps](#add-a-source-that-an-existing-adapter-can-read) |
| `unknown adapter` | The row's `adapter` does not exist in `ADAPTERS` | Fix the name, or set `is_active = false` until the adapter exists |
| `feed returned HTTP 404` or a DNS error | The address moved or the site is gone | Find the new address and `UPDATE job_sources SET feed_url = '...'` |

**2. Is the nightly job itself running?** `select jobname, schedule, active from cron.job;` shows the four schedules, and
[HANDBOOK > Operating production](HANDBOOK.md#operating-production) says how to read the HTTP replies if `scrape_runs` stays empty.

**3. Do the addresses in the documentation still work?**

```bash
./scripts/check-source-links.sh
```

It lists every address in [SOURCES.md](SOURCES.md) that does not answer 200. A 403 is usually a site that refuses
automated requests, and a 404 or "000" is a real problem: fix the address in `docs/SOURCES.md` (edit the file directly) and, for a job source, the `feed_url` in the
`job_sources` table.

**4. Try one source by hand** with a dry run, which fetches and checks but inserts nothing
([Running it by hand](#running-it-by-hand)).

### Change the schedule

How often the import, link check and organiser run is set in the database, not in code:
[HANDBOOK > Operating production](HANDBOOK.md#operating-production) has the `cron.alter_job` commands.
The window for which postings count as too old is the source's `max_age_days`.

### Apply a change to production

| You changed | Do |
|-------------|----|
| A row in `job_sources` or any SQL | A new file in `supabase/migrations/`, applied with `psql` ([HANDBOOK > Deployment](HANDBOOK.md#deployment)). `db push` does not work on production |
| `_shared/adapters.ts`, `_shared/ingest.ts` or `_shared/llm.ts` | `npx supabase functions deploy ingest-jobs rescore-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |
| `_shared/liveness.ts` | `npx supabase functions deploy check-listings --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |
| `_shared/structure.ts` | `npx supabase functions deploy structure-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |
| Several of these | Deploy them all together: `npx supabase functions deploy ingest-jobs rescore-jobs check-listings structure-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |

Functions import the `_shared` files at deploy time, so a change to a shared file does nothing on production until the
functions that use it are redeployed. **A new source is picked up by the next 03:00 UTC run**, or import it at once by
calling `ingest-jobs` with `{"source": "<slug>"}` (key and address: [Running it by hand](#running-it-by-hand), with the
production address from [HANDBOOK](HANDBOOK.md#production-setup-one-time)). Imported jobs always land as pending, so
an admin sees them in the queue before anyone else does.

---

## Deduplication and freshness

**Deduplication**, enforced by unique indexes:

- `source_url`: the same posting is never imported twice.
- `content_hash`: SHA-256 of normalised `title + institution`, so the same role syndicated under
  different URLs collapses to one.

A duplicate insert returns Postgres error `23505`, which the function counts and does not treat as a failure.

**Freshness.** Feeds keep entries for very different lengths of time: jobRxiv expires its own within days,
CoMSES still lists postings from 2021. Three signals retire a listing at import:

- **A stated deadline that has passed**, read from the description by `extractDeadline()`.
- **A posting date older than the source's window**, set per source in `job_sources.max_age_days`
  (`NULL` turns it off). Current windows: CoMSES 180 days, Workday universities 365, jobRxiv none.
- **A closing date found by the AI.** Most postings state it near the end, so the prompt includes short
  excerpts around any "deadline" or "apply by" wording. A year-less date is resolved from the posting date, a
  date when review of applications *begins* is ignored, and an implausible date becomes null.

A listing with **no date at all is kept**: no date is not evidence of staleness, and an admin can still
judge it. About 85% of postings state no deadline, so most stay until the link check finds them closed.

```sql
-- Tune a source's window without a deploy
UPDATE job_sources SET max_age_days = 365 WHERE slug = 'comses';
```

After import: the public read rule hides a job after its `application_deadline` with no polling (a job
stays visible through the deadline day, UTC), and `purge_expired_jobs()` deletes jobs past their deadline,
hidden dead or closed jobs after 3 days, and auto-imported jobs rejected for more than 30 days (clock:
`rejected_at`). Jobs a person posted and an admin rejected are kept by the purge. Tags, saved jobs, alert
matches and queued emails cascade with the job.

---

## The AI verdict

**The definition** both the AI and the keyword lists follow: *computational social science is using
computation to measure and model human behavioural data, with computational methods (data science, network
analysis, natural language processing, large-scale digital trace data analysis, machine learning, online or
digital experiments) used to study social, political, economic or behavioural questions. A role needs both a
computational method and a social or behavioural subject. Pure natural science, clinical, biomedical,
administrative, sales or marketing roles are excluded.* It is written out in the prompt in
`_shared/llm.ts`; the keyword lists in `_shared/ingest.ts` mirror it.

Relevance runs in two steps, and **it only files and orders the queue**:

1. **Keyword pre-filter (free).** `scoreRelevance()` scores obviously unrelated roles (clinical, lab,
   marketing, administrative) as excluded, and those skip the AI. On a random sample the AI agreed with this
   filter on 98 of 99 jobs.
2. **AI verdict.** For everything else, `scoreWithLlm()` asks a Claude Haiku model to apply the definition and
   return a **verdict**, a one-sentence **reason** (shown as "AI: ..." in the admin tooltip) and the
   **closing date** if the posting states one. There is **no numeric score**. Only new jobs are checked.

**Verdicts**, stored in `jobs.relevance_verdict`:

| Verdict | Meaning | What happens |
|---------|---------|--------------|
| `accept` | A clear CSS fit | Pending, sorted first |
| `borderline` | Adjacent, or too vague to tell (the prompt says to choose this when unsure) | Pending, sorted second |
| `reject` | Clearly not CSS | Inserted as `rejected`, kept 30 days, can be restored |
| (none) | The keyword filter excluded it, or the AI call failed | Excluded: rejected. Failed: pending |

If the AI is unavailable (no key, API error, refusal, or a reply without a valid verdict) the job falls back to
the keyword check, which never rejects on its own; only a keyword-excluded role is rejected. `relevance_score`
now holds just the keyword score and is not used for ordering. Settings: `ANTHROPIC_API_KEY`, optional
`ANTHROPIC_MODEL`, and `MAX_LLM_PER_RUN` (default 150; jobs beyond it keep the keyword result). Cost is a small
fraction of a cent per new job; check real spend in the Anthropic Console.

**Re-running the verdict.** After changing the prompt or rules, call `rescore-jobs`. It re-scores every
auto-imported job still pending or rejected and files each by its new verdict (a wrongly rejected job can
come back). It skips published jobs and any job an admin acted on, and leaves a job unchanged if the AI call
fails. It works in pages of up to 200 and returns `next`; repeat with `"after": next` until it is null (add
`"dryRun": true` to preview). **Run the link check to completion first**, so dead jobs are deleted instead of
scored: hard checks, then the AI.

---

## The link check

`check-listings` re-checks stored jobs' links (`source_url`, or `application_url` for hand-posted jobs):

| Result | Meaning |
|--------|---------|
| `live` | Page loads and looks open |
| `dead` | HTTP 404 or 410, or a redirect to the site's home page |
| `closed` | A past `validThrough` date, a visible "listing has expired" notice, a passed `application_deadline`, or a Workday posting with applications closed |
| `unknown` | Blocked (403 or 429), a server error, a timeout, or a page with no readable text: **never acted on** |

**What it does with a dead or closed job:**

| The job | Action |
|---------|--------|
| Imported, pending or rejected | Deleted (a closed posting has no value to keep, and feeds list only open roles) |
| Posted by a person, pending or rejected | **Kept**; the result is recorded on the job so an admin can see it (a typo in a link must not make a submission vanish) |
| Published | Hidden at once (`job_status = 'filled'`); the purge deletes it 3 days later, leaving time to reactivate a wrong flag |

The rule is `linkCheckAction` in `_shared/liveness.ts`. A few details learned the hard way:

- **Workday** pages are JavaScript apps that answer 200 for anything, so Workday jobs are checked through the
  same JSON endpoint the importer uses. This covers `<tenant>.wdN.myworkdayjobs.com` links and
  `wdN.myworkdaysite.com/recruiting/...` links (University of Washington). A Workday **403** means a posting was
  taken down but can also mean we are blocked, so it counts as `dead` only when the tenant's own job search no
  longer lists the requisition.
- **Oracle Recruiting** pages (Stanford) are also JavaScript apps, so they are checked through Oracle's REST service: no
  matching requisition means `dead`, and a past end date means `closed`. A made-up job id was reported live by the plain
  page check, which is why this exists.
- A **429** (rate-limited) is retried once after a few seconds; a job left `unknown` is tried again after a day
  (not the full week).
- The word "expired" in a stylesheet is not a closed posting: the check reads only visible text, status codes,
  redirects and structured metadata.

Published jobs are rechecked every 3 days and pending and rejected jobs weekly (`publishedRecheckDays` and
`recheckDays` in the request body). Each call takes the least recently checked jobs first and is gentle on
the sites (two requests at a time with a short pause), so a large backlog takes a while: about 20 minutes for
a thousand jobs. It never publishes anything; hiding a published job is the only public-facing change.

---

## Organised job text

Published jobs are organised into labelled sections (Overview, Responsibilities, Qualifications,
Compensation and benefits, How to apply, About the employer, Other) plus pay range, application link, deadline and
location. The original description is never changed; the job popup shows the organised copy when there is one,
with a **Show original posting** toggle.

- **Which jobs:** any job that is approved, published and active and has no organised copy yet. This is by
  state and not by AI verdict, so a job an admin approves after the AI rejected it is covered, as are
  hand-posted jobs and bulk approvals. Pending and rejected jobs are not organised.
- **How:** `structure-jobs` runs every 15 minutes for up to 20 jobs; a run with nothing to do costs nothing.
  Admins can use **Organise now** in Job Management for one job.
- **The model only points at text.** It returns exact quotes and where each section starts.
  `_shared/structure.ts` checks every quote against the posting and slices the original text, so a pay figure,
  link or date that the posting does not contain is dropped and no wording changes. Matching ignores case,
  spacing and punctuation but keeps a currency sign. Thinking is off for this call: it only copies, and hidden
  thinking used up the output budget on long postings.
- **The application link** found this way is shown only when a job has no application URL, and only if it is an
  `http(s)` address.
- **Cost:** about $0.0004 per job on Claude Haiku 5.5 (about 2,500 tokens in, 300 out), measured on a 50-job
  trial where all 50 succeeded and no text was lost.
- **Failures:** a job the model could not read gets `structure_failed_at` and is tried again after 6 hours.
  Editing a job's description clears its organised copy (a database trigger), so it is redone.
- **Storage:** `jobs.structured` (jsonb), `structured_at`, `structure_failed_at` (migration `20260813000000`).

---

## Scheduling

Four schedules run in the database (`pg_cron`), each calling a SQL function that posts to an edge function:

| Job | When (UTC) | Calls | What it does |
|-----|------------|-------|--------------|
| `ingest-jobs-daily` | 03:00 daily | `run_job_ingestion()` | Fetch, get a verdict, insert as pending or rejected |
| `purge-expired-jobs` | 00:05 daily | `purge_expired_jobs()` | Delete expired, hidden dead and old rejected jobs |
| `check-listings` | every 2 hours, at :15 | `run_listing_check()` | Link check, up to 60 due jobs per call |
| `structure-jobs` | every 15 minutes | `run_job_structuring()` | Organise up to 20 published jobs |

**Scheduling covers fetching and checking only.** Imported jobs still land as `pending` or `rejected` and an
admin approves every one.

### Configuration

The function address and the credential live in `ingestion_settings` (admin-only, RLS enabled), not in the cron
command, which anyone who can query `cron.job` can read:

```sql
INSERT INTO ingestion_settings (key, value) VALUES
  ('function_url', 'https://<project>.supabase.co/functions/v1/ingest-jobs'),
  ('service_role_key', '<the SCHEDULER_SECRET value>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

The functions accept either the project's service role key or a `SCHEDULER_SECRET`, compared in constant time and
never under 32 characters (`_shared/auth.ts`). The value stored in `service_role_key` is sent as the bearer
token. On production the service key shown in the dashboard did not match the one the deployed functions hold
(found by comparing digests from `supabase secrets list`), so it returned 401; a dedicated secret avoids that and
can be rotated on its own. The other functions' addresses are derived from `function_url` (optional keys
`check_listings_url` and `structure_jobs_url` override them). Step by step: [HANDBOOK > Production setup](HANDBOOK.md#production-setup-one-time).

The cron log only shows that the SQL ran, not that the function succeeded. Check `scrape_runs` and
`net._http_response` (see [HANDBOOK > Operating production](HANDBOOK.md#operating-production)).

---

## Running it by hand

Locally (Docker Desktop running, `npx supabase start`, functions served; see
[HANDBOOK > Local development](HANDBOOK.md#local-development)):

```bash
SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

# Import. Body options: "dryRun": true (fetch and check, insert nothing), "llm": false (skip the AI),
# "source": "<slug>" (one source). Run sources one at a time: a call over every source can hit the time limit.
curl -s -X POST http://127.0.0.1:54321/functions/v1/ingest-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"source":"wd-uw","dryRun":true}'

# Link check (repeat until "remaining" is 0)
curl -s -X POST http://127.0.0.1:54321/functions/v1/check-listings \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 60}'

# AI verdict over what is queued (repeat with "after": <next> until next is null)
curl -s -X POST http://127.0.0.1:54321/functions/v1/rescore-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 100}'

# Organise published jobs ("jobId": "<uuid>" for one job)
curl -s -X POST http://127.0.0.1:54321/functions/v1/structure-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 20}'
```

The import response reports, per source, `fetched`, `inserted`, `duplicates`, `skipped`, `stale`, `llmScored`,
`llmFallback` and `autoRejected`, plus a few sample listings with their verdicts.

**The order for a first import, or after a long gap, is hard checks first:** import with `"llm": false`, run the
link check until `remaining` is 0, then run `rescore-jobs`. The AI then never scores a job that turns out to be
dead.

---

## Tests and safety checks

Two layers, because they answer different questions.

**Unit tests, `npx vitest run`.** Cover the pure functions with feeds and the AI client mocked: fast, with no
database or network. They include entity decoding, HTML stripping (also for doubly escaped HTML), job-type mapping,
keyword scoring, content hashing, constraint validation, feed parsing, AI reply parsing, deadline validation, link
classification and the delete/keep/hide rule, the organiser's quote checking, the credential check, role names, and a
rendering test of the profile page for every kind of account. Notable cases:

- **Bot-protection pages are treated as failures.** HigherEdJobs answers 200 with a protection page; parsing it as
  RSS would report "0 jobs" and look like a quiet day.
- **`mapJobType` never returns `'RA'`.** That value exists in an old migration but not in production, so it would fail every insert.
- **Malformed listings are skipped, not thrown.** One bad item must not abort a 100-item run.
- **Any AI failure falls back to the keyword result.** An API error, refusal or unreadable reply never aborts a run.
- **A doubtful AI deadline is discarded.** Impossible dates, dates years away and review-start dates become null.
- **A quote the model invents is dropped**, so a made-up pay figure, link or date cannot reach applicants.

**Safety checks, `./scripts/verify-ingestion.sh`.** Database-level checks against the running local stack that
verify what a buggy import or a hostile caller can actually do: an anonymous API request returns no imported jobs;
an insert claiming `approved`, `published` or `featured` is clamped to pending even from SQL; a duplicate
`source_url` or `content_hash` is rejected; the database constraints hold (short description or title, non-http URL);
and the ingest endpoint rejects the anonymous key. It cleans up its own test rows. It needs Docker and
`npx supabase start`, and was not re-run for the November 2026 documentation update.

`scripts/seed-demo-jobs.sql` adds two published jobs for local demos, so the public board is not empty next to a
queue of hidden imports. **Local use only; never run it against production.**
