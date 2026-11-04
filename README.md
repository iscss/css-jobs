# CSS Jobs - Academic Opportunities in Computational Social Science

**Production URL:** https://jobs.iscss.org
**Sister site:** [CSS Events](https://events.iscss.org) (https://github.com/iscss/css-events)
**Accounts:** Vercel and Supabase are under `admin@iscss.org`

> A more detailed handover document exists at `HANDOVER.md`. It was written in December 2025 and covers the original architecture, database schema, approval workflows, and email alerts system in depth. The main differences since then: the production URL moved from `css-jobs.andersgiovanni.com` to `jobs.iscss.org`, the Supabase project was migrated to a new instance (`ukkqeczgommifgecyrez`), and an email opt-out/unsubscribe system was added. Everything else described in the handover remains accurate.

---

## Quick Start

```bash
npm install
cp .env.example .env
# Add Supabase credentials to .env

npm run dev
# Opens at http://localhost:8080
```

---

## What This Application Does

A job board for **Computational Social Science** academic positions (PhDs, postdocs, faculty, research collaborations).

- **Job seekers:** Browse, filter, save, and get alerts for jobs
- **Job posters:** Create job postings (requires admin approval, or auto-approved for verified university emails)
- **Admins:** Approve/reject users and jobs, manage all content from `/admin`
- **Automation:** Jobs are imported from external feeds each night, checked for dead links, scored for relevance, and queued for admin review. Nothing is published without an admin approving it. See [Automated Job Ingestion](#automated-job-ingestion).

There is no separate landing page: `/` redirects to the jobs list at `/jobs`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI** | Tailwind CSS + shadcn/ui + Radix UI |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **State** | React Query (@tanstack/react-query) |
| **Routing** | React Router v6 |
| **Forms** | React Hook Form + Zod |
| **Security** | DOMPurify + Row-Level Security (RLS) |
| **Relevance scoring** | Anthropic API (Haiku model), called from an edge function |
| **Hosting** | Vercel (frontend) + Supabase Cloud (backend) |

---

## Project Structure

```
css-jobs/
├── src/
│   ├── pages/              # 12 route pages
│   ├── components/
│   │   ├── admin/          # Admin dashboard components
│   │   ├── auth/           # Email verification handler
│   │   ├── home/           # Homepage components
│   │   ├── jobs/           # Job listing and detail components
│   │   ├── layout/         # Header, Footer, modals
│   │   ├── profile/        # User profile components
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # 15 custom React Query hooks
│   ├── contexts/           # AuthContext for session management
│   ├── integrations/       # Supabase client + auto-generated types
│   └── lib/                # Utilities (sanitize, rate-limit, domain-loader) + ingestion tests
├── supabase/
│   ├── functions/          # Edge functions (delete-user, unsubscribe, ingest-jobs, check-listings)
│   │   └── _shared/        # Feed adapters, normalization, AI scoring, link checking
│   └── migrations/         # SQL migrations
├── public/                 # Static assets (team photos, university-domains.json)
├── HANDOVER.md             # Detailed project handover (Dec 2025)
├── INGESTION.md            # Automated ingestion notes and demo runbook
└── vercel.json             # Deployment config with security headers
```

---

## Relationship to CSS Events

CSS Jobs shares a **Supabase project** with [CSS Events](https://events.iscss.org) (`ukkqeczgommifgecyrez`):

- **Same auth:** Users can sign in on either site with the same account
- **Same `user_profiles` table:** The `is_admin` flag works across both sites
- **Separate data:** Jobs and events are independent tables
- **Separate codebases:** UI components were copied, not shared, so the apps can diverge

---

## Environment Variables

Required in `.env` (and in Vercel dashboard):

```env
VITE_SUPABASE_URL=https://ukkqeczgommifgecyrez.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
```

Get these from: [Supabase Dashboard](https://supabase.com/dashboard/project/ukkqeczgommifgecyrez) > Settings > API

Vite bakes `VITE_*` variables into the bundle at build time. If you change them in Vercel, you must redeploy.

### Edge function secrets (not in `.env`, not in Vercel)

The ingestion functions run on Supabase, so their secrets live there:

| Secret | Required | Purpose |
|--------|----------|---------|
| `ANTHROPIC_API_KEY` | For AI scoring | Anthropic API key. Without it, ingestion still runs and falls back to keyword scoring. |
| `ANTHROPIC_MODEL` | No | Model override. Defaults to the Haiku model set in `supabase/functions/_shared/llm.ts`. |
| `MAX_LLM_PER_RUN` | No | Cap on model calls per ingestion run (default 150). |

```bash
# Production
npx supabase secrets set ANTHROPIC_API_KEY=<key> --project-ref ukkqeczgommifgecyrez
```

For local development, copy `supabase/functions/.env.example` to `supabase/functions/.env` (gitignored) and fill in the key. **Never** put this key in `.env` or any `VITE_*` variable: those are bundled into the public site. Set a monthly spend limit on the key's workspace in the Anthropic console.

---

## Database

See `HANDOVER.md` for the full schema. Core tables:

| Table | Purpose |
|-------|---------|
| `jobs` | Job postings with approval workflow |
| `user_profiles` | Users with roles (seeker, poster, admin). Sign-up now creates posters only; job seekers browse and apply without an account, and older seeker accounts keep working |
| `saved_jobs` | User bookmarks |
| `job_alerts` | Alert configs (infrastructure ready, needs Resend API) |
| `email_queue` | Email sending queue (awaiting Resend) |
| `approved_domains` | University email whitelist (5,000+ institutions) |
| `job_sources` | Feeds and career sites the importer reads (one row per source) |
| `scrape_runs` | Log of each import run: counts fetched, inserted, duplicate, stale, errors |
| `ingestion_settings` | Function URL and service key used by the nightly schedule (admin-only) |

Columns added to `jobs` for automation: `is_auto_imported`, `source`, `source_url`, `content_hash`, `relevance_score`, `relevance_reasoning`, `posted_at`, `application_deadline`, `link_status`, `link_status_reason`, `link_checked_at`, `relevance_verdict`, `rejected_at`, and (for the organiser) `structured`, `structured_at`, `structure_failed_at`.

### Admin Access

The first admin has to be set in SQL. After that, an admin can grant or revoke
admin from **Admin → User Management** (Grant Admin / Remove Admin).

```sql
-- Set an admin in Supabase SQL Editor
UPDATE user_profiles
SET is_admin = true
WHERE email = 'new-admin@example.com';
```

Only admins (and server-side code such as the sign-up trigger) can change
`is_admin`, `is_approved_poster`, `can_publish_directly` or `approved_jobs_count`.
A trigger (`protect_privileged_profile_columns`, migration `20260811000000`)
quietly resets them for anyone else, because the "update own profile" policy
would otherwise let any signed-in user make themselves an admin. Posters are
approved for direct publishing automatically after 3 approved jobs; the count is
kept by the `track_job_approval` trigger, so do not add to it from the app.

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `delete-user` | Admin user deletion (cascades profile + auth, CORS-restricted to `jobs.iscss.org`) |
| `unsubscribe` | Email opt-out via tokenized link |
| `ingest-jobs` | Fetches new postings from the sources, scores them, inserts them as pending. Service-role only. |
| `structure-jobs` | Organises published jobs into labelled sections and key fields (every 15 minutes, or per job from Job Management). Service-role or scheduler-secret only. |
| `check-listings` | Re-checks stored jobs' links and removes dead or closed ones. Service-role or scheduler-secret only. |
| `rescore-jobs` | Re-runs the AI verdict over pending and rejected imports (after a prompt change). Manual only. Service-role or scheduler-secret only. |

The four scheduled or manual functions accept either the project's service role
key or a `SCHEDULER_SECRET` (see `supabase/functions/_shared/auth.ts`). On
production the service key shown in the dashboard did not match the one the
deployed functions hold, so the scheduler uses `SCHEDULER_SECRET` and stores it in
`ingestion_settings.service_role_key`.

Deploy:
```bash
npx supabase functions deploy delete-user
npx supabase functions deploy unsubscribe
# Called by the scheduler with the service key, not by signed-in users,
# so the built-in JWT check is off (see supabase/config.toml). The functions
# verify the service key themselves.
npx supabase functions deploy ingest-jobs --no-verify-jwt
npx supabase functions deploy check-listings --no-verify-jwt
npx supabase functions deploy rescore-jobs --no-verify-jwt
npx supabase functions deploy structure-jobs --no-verify-jwt
```
In agent or CI runs the CLI asks for `--yes` before changing a hosted project.

**Note:** The `delete-user` function has an `ALLOWED_ORIGINS` list. If the production domain changes, update `supabase/functions/delete-user/index.ts`.

---

## Deployment

### Frontend (Vercel)

- Auto-deploys from `main` branch on GitHub (`iscss/css-jobs`)
- Environment variables set in Vercel dashboard
- Account: `admin@iscss.org`

### Database

```bash
# Link to Supabase (one-time)
npx supabase link --project-ref ukkqeczgommifgecyrez

# Create a migration
npx supabase migration new description_here

# Apply to production
npx supabase db push

# Regenerate TypeScript types
npx supabase gen types typescript --project-id ukkqeczgommifgecyrez > src/integrations/supabase/types.ts
```

**Note:** This Supabase instance is shared with css-events. Both repos have their own local migration files; the remote tracks all of them.

**`db push` does not work against production.** The production schema was set up
before this repo used the CLI, so its migration history lists only
`20260305000000` from here, plus three CSS Events migrations
(`20260305000001`-`03`) that this repo does not have. `supabase db push` stops
with "Remote migration versions not found in local migrations directory", and
would otherwise try to re-run the original schema. The migrations from August
2026 onward were applied with `psql` instead, one file or a batch in a single
transaction:

```bash
cd supabase/migrations
psql "<session pooler string for the production project>" \
  -v ON_ERROR_STOP=1 --single-transaction -f 20260813000000_structured_job_content.sql
```

Use the **Session pooler** string (the direct connection is IPv6-only on the free
plan). Check what production has first with
`npx supabase db query --remote --read-only "select ..."`; the CLI's `--read-only`
flag lets an agent look without changing anything. Do not run `supabase db
reset` or `db push` against production.

### Development

```bash
npm run dev      # Dev server (port 8080)
npm run build    # Production build
npx tsc --noEmit # Type check
npx vitest run   # Run tests
```

---

## Automated Job Ingestion

Jobs are pulled in automatically, but **a person approves every job before it goes live.**

```
sources -> fetch -> clean up -> remove repeats -> keyword pre-filter -> AI verdict
        -> insert as pending -> link check -> admin review -> approve -> public
        -> organise (sections and key fields)
```

### How it works

1. **Sources.** Rows in `job_sources`: the jobRxiv feed, the CoMSES Net feed, and several university career sites on Workday. Each source names an adapter (`rss-jobrxiv`, `rss-comses`, `rss-generic`, `workday`) in `supabase/functions/_shared/adapters.ts`. Adding a source is one row if an adapter already fits.
2. **Schedule.** `pg_cron` calls `ingest-jobs` daily at 03:00 UTC. Requests identify as `CSSJobsBot` and are spaced out to stay polite to the sites.
3. **Clean up.** HTML is stripped, fields are trimmed to the database limits, job type and posting date are parsed, and stale or malformed listings are skipped.
4. **Remove repeats.** By title + institution hash, and by `source_url`, before any paid scoring.
5. **Keyword pre-filter.** A short disqualifier list (clinical, lab, marketing and similar roles) scores obvious non-CSS jobs 0 for free, so they skip the model.
6. **AI verdict.** The Anthropic Haiku model reads each remaining posting and returns a verdict (accept, borderline or reject, no numeric score), a one-sentence reason (shown as "AI: ..." in the admin tooltip), and the application closing date if the posting states one. If the API is unavailable, the job keeps its keyword check, has no verdict, and ingestion continues.
7. **Insert as pending.** The `trg_imported_jobs_pending` trigger forces every imported job to `pending` and unpublished, so a bug in the code cannot publish anything.
8. **Admin review.** The `/admin` queue is sorted by verdict (accept first, then borderline). The verdict only orders and files the queue; an admin approves every job.
9. **Organise.** Once a job is published, `structure-jobs` (every 15 minutes) splits its text into labelled sections and pulls out pay, application link, deadline and location. The AI only quotes the posting; the code checks each quote and uses the original wording. See `INGESTION.md`, "Organised job text".

### Safety guarantee

Imported jobs are hidden from the public by Row-Level Security at the database level, not by the UI. The checks in `scripts/verify-ingestion.sh` confirm this (anonymous API requests return no imported jobs, the trigger cannot be bypassed, the ingest endpoint rejects the anon key).

Posting text comes from third parties, so the scoring prompt treats it as data and the model's reply is validated strictly. The reply is only a label (accept, borderline or reject), a sentence, and a date.

### Expiry and cleanup

- **Closing date.** When a posting states one, it is stored in `application_deadline`. The public read rule hides a job after that date (a job stays visible through the deadline day, UTC), with no polling.
- **Nightly purge.** `purge_expired_jobs()` runs at 00:05 UTC and deletes jobs past their deadline (published or not), hidden dead or closed jobs after 3 days, and **auto-imported jobs that have been rejected for more than 30 days** (the clock is `rejected_at`, set when a job is rejected and cleared if it is approved). Jobs a person posted and an admin rejected are kept.
- **Link check.** `check-listings` visits each job's link (`source_url`, or `application_url` for hand-posted jobs). It treats HTTP 404/410, a redirect to the site's homepage, a visible "listing has expired" notice, a past `validThrough` date, or a Workday posting that can no longer be applied to as gone. A blocked or timed-out request is "unknown" and never acted on.
  - Pending and rejected jobs found gone are deleted.
  - Published jobs found gone are hidden at once (`job_status = 'filled'`) and deleted by the purge 3 days later, which leaves time for an admin to reactivate one that was flagged by mistake.
  - Published jobs are rechecked every 3 days, pending and rejected jobs weekly. A `pg_cron` entry (`check-listings`, every 2 hours) calls the function in small batches, least recently checked first, using the same `ingestion_settings` as the nightly import. You can also run it by hand (below).

### Running it locally

```bash
npx supabase start
cp supabase/functions/.env.example supabase/functions/.env   # then add your key
npx supabase functions serve --no-verify-jwt --env-file supabase/functions/.env
npm run dev

SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

# Import (add "dryRun": true to fetch and score without inserting, or "llm": false to skip the model)
curl -s -X POST http://127.0.0.1:54321/functions/v1/ingest-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{}'

# Link check (repeat until "remaining" is 0)
curl -s -X POST http://127.0.0.1:54321/functions/v1/check-listings \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 60}'
```

### Production setup (one time)

Done for production (`ukkqeczgommifgecyrez`) on 2026-11-04. To repeat it, or set up
another project:

1. **Apply the migrations** with `psql` (not `db push`; see [Deployment](#deployment)). These change the live database, so review them first. Files `20260803000000` to `20260814000000`, in order.
2. **Deploy the functions** (see [Edge Functions](#edge-functions)).
3. **Set the secrets:** `ANTHROPIC_API_KEY`, and a `SCHEDULER_SECRET` made with `openssl rand -hex 32`. Make the Anthropic key from an ISCSS-owned Console account, with a spend limit, and keep a separate key for development.
4. **Tell the scheduler where to call.** Put the same `SCHEDULER_SECRET` value in `ingestion_settings`:

```sql
INSERT INTO ingestion_settings (key, value) VALUES
  ('function_url', 'https://ukkqeczgommifgecyrez.supabase.co/functions/v1/ingest-jobs'),
  ('service_role_key', '<the SCHEDULER_SECRET value>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

   Check it: send a dry run with `net.http_post` as the scheduler does and read the status in `net._http_response` (expect 200; 401 means the stored value differs from the function's secret). Compare fingerprints without exposing either value: `supabase secrets list` shows a SHA-256 digest, and `select encode(sha256(convert_to(value,'UTF8')),'hex') from ingestion_settings where key='service_role_key'` gives the other.
5. **First import**, one source at a time with the AI off, then the link check, then the AI vetting (hard checks before the AI): call `ingest-jobs` with `{"source": "<slug>", "llm": false}` for each source, `check-listings` until `remaining` is 0, then `rescore-jobs` in pages until `next` is null. A single call over all sources can hit the function time limit.
6. **Check the schedule really ran.** The `pg_cron` log only says the SQL ran. Look for new rows in `scrape_runs` after 03:00 UTC, and for the `structure-jobs` and `check-listings` effects.

### Tests and cost

- `npx vitest run` covers the pure logic (feed parsing, normalization, scoring parser, deadline handling, link classification) with the network mocked.
- `./scripts/verify-ingestion.sh` runs the database-level safety checks against the local stack.
- The AI verdict costs a small fraction of a cent per new job, and unchanged or already-seen jobs cost nothing. The organiser measured about $0.0004 per job on Claude Haiku 5.5 (a 50-job trial), and only runs on published jobs. Check real spend on the Anthropic console's usage page for the workspace.

### Known limitations

- Most postings state no closing date, so they stay up until the link check finds them closed.
- **jobRxiv returns HTTP 403 to requests from Supabase's servers** (it sits behind Cloudflare; the same feed works from other networks), so it is not imported on production. The importer identifies itself honestly and does not try to evade the block. The options are to ask jobRxiv to allow `CSSJobsBot`, or to load its jobs from somewhere else.
- Carnegie Mellon's Workday endpoint returns HTTP 422 on every run, so it is not seeded.
- The link check treats a Workday 403 as "removed" only when the tenant's own job search no longer lists the job; otherwise it stays "unknown".
- A job needs an application link or a contact email to be submitted or published (checked in the posting and edit forms, not by a database rule, because older jobs lack both). An admin can still save an edit without one.
- The key is tied to the account that created it. Create the production key from an ISCSS-owned account so the automation does not depend on one person's membership.

See `INGESTION.md` for the original demo runbook.

---

## Email Notifications (Optional — Not Yet Enabled)

The app has a built-in email notification system that is fully wired up in the database but **not yet sending emails**. It was built to use [Resend](https://resend.com), a transactional email service with a free tier (100 emails/day, no credit card required).

The plumbing that's already in place:
- An `email_queue` table in the database where notification emails accumulate
- Database functions that automatically queue emails when: a job matching a user's alert is published, a saved job's application deadline is approaching, or an admin approves a job posting
- Job alert matching logic (`job_alerts` and `job_alert_matches` tables)
- UI components for managing alerts (built but commented out in the profile page)

What's missing is the piece that reads from the queue and actually sends the emails. To enable this:

1. **Sign up** at [resend.com](https://resend.com) and verify a sending domain (e.g. `iscss.org`) — this involves adding a few DNS records to prove you own the domain
2. **Get an API key** from the Resend dashboard
3. **Add the key to Supabase:** `npx supabase secrets set RESEND_API_KEY=re_xxxxx`
4. **Build and deploy an edge function** that processes the queue — it needs to read rows from `email_queue` where `sent_at IS NULL`, send each one via the Resend API, and mark them as sent
5. **Set up a cron trigger** (via Supabase or an external service) to run that function periodically (e.g. every 5 minutes)
6. **Uncomment the alerts UI** in `src/pages/Profile.tsx` to let users configure their alert preferences

Note: basic account emails (signup confirmation, password reset) already work — those are handled by Supabase Auth's built-in email service and are unrelated to this queue.

---

## Security

- **Input sanitization** via DOMPurify — all user inputs sanitized, HTML whitelisted in job descriptions only
- **Row-Level Security** — 27 RLS policies, users access only own data, admins have overrides
- **Rate limiting** on auth attempts (client-side)
- **Content Security Policy** headers in `vercel.json` and `vite.config.ts`
- **Edge function security** — JWT verification, admin-only, self-deletion prevention, CORS origin checks
- **Ingestion endpoints** — `ingest-jobs`, `check-listings`, `rescore-jobs` and `structure-jobs` accept only the service role key or `SCHEDULER_SECRET`, compared in constant time and never under 32 characters (the anon key is rejected); imported jobs are forced to `pending` by a database trigger
- **Privilege columns** — a trigger stops non-admins changing `is_admin`, `is_approved_poster`, `can_publish_directly` and `approved_jobs_count`, including by deleting and re-inserting their own profile
- **Organised job text** — the AI never writes text shown to applicants: every quote is checked against the original posting, links must be `http(s)`, and the stored JSON is validated before the page shows it
- **Secrets** — `ANTHROPIC_API_KEY` is a Supabase secret; `supabase/functions/.env` is gitignored
