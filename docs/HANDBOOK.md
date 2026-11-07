# CSS Jobs handbook

Everything needed to run, change and hand over the project: architecture, database, roles,
security, deployment, production operations, local development and known issues. Part of
the [CSS Jobs documentation](../README.md#documentation).

Other documents: [INGESTION.md](INGESTION.md) (the importer, AI and link check),
[SOURCES.md](SOURCES.md) (job sources and the CSS community), [BRANDING.md](BRANDING.md) (colours, fonts, design).

**Contents**

1. [At a glance](#at-a-glance)
2. [Architecture](#architecture)
3. [Environment variables and secrets](#environment-variables-and-secrets)
4. [Database](#database)
5. [Roles and permissions](#roles-and-permissions)
6. [Workflows](#workflows)
7. [Features](#features)
8. [Security](#security)
9. [Deployment](#deployment)
10. [Production setup (one time)](#production-setup-one-time)
11. [Operating production](#operating-production)
12. [Local development](#local-development)
13. [Common tasks](#common-tasks)
14. [Known issues and future work](#known-issues-and-future-work)
15. [Migrations and schema drift](#migrations-and-schema-drift)
16. [History](#history)

---

## At a glance

| | |
|---|---|
| **Live site** | https://jobs.iscss.org |
| **Repository** | https://github.com/iscss/css-jobs (deploys from `main`) |
| **Sister site** | [CSS Events](https://events.iscss.org), repo https://github.com/iscss/css-events |
| **Frontend hosting** | Vercel (project `cssjobs`), account `admin@iscss.org` |
| **Backend** | Supabase project `ukkqeczgommifgecyrez` ("admin@iscss.org's Project"), **shared with CSS Events** |
| **Old project id** | `vbekddjiflstedhvrhwt` in `supabase/config.toml` is the project the board used **before** the move to the current one. The local Docker stack takes its container names from it. It is not production now; point nothing at it |
| **Automation** | Importer, link check, organiser and purge run on schedules in the database; deployed 2026-11-04 |
| **Status** | Live. About 30 accounts at launch; the importer found 153 jobs on its first run (jobRxiv blocked, see [Known issues](#known-issues-and-future-work)) |

There is no landing page: `/` is the jobs list. Routes: `/` (jobs; `/jobs` redirects here), `/auth`,
`/forgot-password`, `/reset-password`, `/post-job`, `/profile`, `/admin`, `/email-verified`, `/unsubscribe`.

---

## Architecture

```
Browser (React + Vite, on Vercel)
   |  public API key, Row-Level Security decides what each visitor can read
   v
Supabase (PostgreSQL + Auth + Edge Functions)         <-- shared with CSS Events
   |  pg_cron + pg_net: the scheduler, inside the database
   +--> edge functions: ingest-jobs, check-listings, rescore-jobs, structure-jobs
   |      (also delete-user and unsubscribe, called from the site)
   v
Anthropic API (Claude Haiku): the AI verdict and the organiser
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI ([BRANDING.md](BRANDING.md)) |
| Backend | Supabase: PostgreSQL, Auth, Edge Functions (Deno) |
| State and routing | React Query (`@tanstack/react-query`), React Router v6 |
| Forms and validation | React Hook Form, Zod |
| Security | DOMPurify, Row-Level Security (RLS) |
| AI | Anthropic API (Claude Haiku), called from edge functions |
| Hosting | Vercel (frontend), Supabase Cloud (backend) |

### Project structure

```
css-jobs/
├── src/
│   ├── pages/          # Route pages (Jobs, Auth, Profile, Admin, PostJob, ...). Index.tsx is no longer routed
│   ├── components/     # By feature: admin/, jobs/, profile/, layout/, home/, auth/, ui/ (shadcn)
│   ├── hooks/          # React Query hooks (jobs, saved jobs, admin, user management, ...)
│   ├── contexts/       # AuthContext: the session
│   ├── integrations/   # Supabase client and types (edited by hand, see Schema drift)
│   └── lib/            # Helpers (sanitize, roles, linkify, ...) and their unit tests
├── supabase/
│   ├── functions/      # Edge functions; _shared/ holds adapters, AI, link check, auth
│   ├── migrations/     # SQL migrations
│   └── config.toml     # Local stack config; verify_jwt is off for the scheduled functions
├── docs/               # This documentation (+ design/ with the chosen mockup)
├── scripts/            # Domain loading, safety checks, demo seed
├── public/             # Static assets: sponsor logos, favicon, university-domains.json
├── index.html          # Page title, share cards, Content-Security-Policy
└── vercel.json         # Security headers and the single-page-app rewrite
```

### Relationship to CSS Events

CSS Jobs and CSS Events share **one Supabase project**:

- **Same sign-in:** one account works on both sites.
- **Same `user_profiles` table:** the `is_admin` flag applies to both.
- **Separate data:** jobs and events are separate tables.
- **Separate code:** UI components were copied, not shared, so the apps can diverge. The brand palette and header
  style are deliberately the same ([BRANDING.md](BRANDING.md)).
- **Shared migration history.** The remote records CSS Events migrations this repo does not have (why `db push` does
  not work; see [Deployment](#deployment)). CSS Events does not read `user_profiles`, so closing public reads on it did
  not affect that site.

---

## Environment variables and secrets

### In `.env` and Vercel (public: bundled into the site)

```env
VITE_SUPABASE_URL=https://ukkqeczgommifgecyrez.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / publishable key>
```

Get these from the Supabase dashboard under **Project Settings > API**. Vite bakes `VITE_*` values into the bundle
at build time, so changing them in Vercel needs a redeploy. They are safe to expose: row-level security decides what
the key can do. **Never put a secret in a `VITE_*` variable.**

### Edge function secrets (on Supabase, not in `.env` or Vercel)

| Secret | Required | Purpose |
|--------|----------|---------|
| `ANTHROPIC_API_KEY` | For the AI steps | Anthropic API key. Without it, ingestion still runs on keyword rules and the organiser does nothing |
| `SCHEDULER_SECRET` | For the schedules | Random value the scheduler sends to the functions (`openssl rand -hex 32`) |
| `ANTHROPIC_MODEL` | No | Overrides the default Claude Haiku model |
| `MAX_LLM_PER_RUN` | No | Cap on AI calls per import run (default 150) |
| `RESEND_API_KEY` | Not used yet | Only for the unbuilt email-alert sender |

```bash
npx supabase secrets set ANTHROPIC_API_KEY=<key> --remote=ukkqeczgommifgecyrez
npx supabase secrets list --remote=ukkqeczgommifgecyrez      # names and SHA-256 digests only
```

For local development, copy `supabase/functions/.env.example` to `supabase/functions/.env` (gitignored). Create the
production key from an ISCSS-owned Console account with a monthly spend limit, keep a separate key for development,
and **never paste a key into chat, issues or commits**. If one leaks, revoke it in the Console and set a new one.

---

## Database

### Core tables

| Table | Purpose |
|-------|---------|
| `jobs` | Job postings, with the approval workflow, the import fields and the organised copy |
| `user_profiles` | One row per account: name, institution, role flags, approval status |
| `job_tags` | Tags on a job |
| `saved_jobs` | A user's bookmarks |
| `job_alerts`, `job_alert_matches` | Alert settings and matches (not enabled) |
| `email_queue` | Emails waiting to be sent (no sender built yet) |
| `approved_domains` | University email whitelist: 10,484 domains loaded in production (from `public/data/university-domains.json`, 10,170 institutions) |
| `poster_applications`, `notification_settings`, `admin_audit_log` | Posting applications, email preferences, an audit trail |
| `events` | CSS Events' table (shared database) |
| `job_sources` | Feeds and career sites the importer reads |
| `scrape_runs` | A log of each import run |
| `ingestion_settings` | The scheduler's address and credential (admin-only) |

Columns added to `jobs` for automation: `is_auto_imported`, `source`, `source_url`, `source_job_id`, `content_hash`,
`relevance_score` (keyword only), `relevance_verdict`, `relevance_reasoning`, `posted_at`, `application_deadline`,
`link_status`, `link_status_reason`, `link_checked_at`, `rejected_at`, and for the organiser `structured`,
`structured_at`, `structure_failed_at`.

### Row-Level Security

Policies on every table decide what each visitor can read or change. The ones that matter most:

- **The public sees only published, approved jobs** (and only until their deadline).
- **User profiles are private.** An anonymous visitor reads no profiles; a signed-in user reads their own; admins read
  all. (Until 2026-11-04 a policy let anyone read every profile, emails included; see [Security](#security).)
- **Admins can update any job** and any profile.
- **Approved posters can create jobs**, and users see their own jobs.
- `ingestion_settings`, `job_sources` and `scrape_runs` are admin-only.

### Important functions and triggers

| Name | What it does |
|------|--------------|
| `is_admin(uuid)` | Used by policies |
| `trg_imported_jobs_pending` | Forces imported jobs to pending or rejected, unpublished |
| `track_job_approval` / `handle_job_approval()` | Adds 1 to a poster's approved-job count when a job is approved; turns on direct publishing at 3 |
| `protect_privileged_profile_columns` | Resets `is_admin`, `is_approved_poster`, `can_publish_directly`, `approved_jobs_count` for non-admins |
| `reset_structured_on_description_change` | Clears a job's organised copy when its description changes |
| `email_is_registered(email)` | Yes or no, for the sign-up form |
| `run_job_ingestion()`, `run_listing_check()`, `run_job_structuring()` | What the schedules call |
| `structure_job_now(uuid)` | "Organise now" for admins |
| `purge_expired_jobs()` | The nightly purge |
| `auto_approve_user_by_domain()` | Approves a poster whose email domain is whitelisted |

---

## Roles and permissions

> **Roles are worked out from what an account can do, not from the stored `user_type`** (`src/lib/roles.ts`):
> **Admin** (`is_admin`), **Job poster** (`is_approved_poster`), **Job poster awaiting approval** (`user_type = 'job_poster'`
> but not approved yet), otherwise **Member**. An admin or approved poster whose stored type still says `job_seeker` is
> shown, counted and allowed accordingly. The profile page shows the role read-only; a Member can ask for posting access there.

**Member** (formerly "job seeker"; auto-approved)
- Browsing and applying never needs an account: the board is public and Apply opens the employer's link.
- Sign-up no longer offers a job-seeker choice; it creates poster accounts. Older seeker accounts keep working.
- Can save jobs. Alerts are not enabled.

**Job poster** (needs approval)
- Everything a member can do, plus creating job postings.
- A new poster's jobs go to **pending** for an admin. After **3 approved jobs** the poster publishes directly. The count is kept by the `track_job_approval` trigger; do not add to it from the app.
- A job needs an application link or a contact email to be submitted (a draft can be saved without).
- University email domains are approved automatically; other addresses wait for an admin.

**Admin** (the first one is set in SQL; after that, **Grant Admin** in User Management)
- Everything, from `/admin`: approve or reject users and jobs (approving is one click; rejecting asks first), edit any job (**Edit job**, including pending ones), redo a job's sections (**Organise now**), feature jobs, delete users and jobs.
- Only admins can change `is_admin`, `is_approved_poster` or `can_publish_directly`.
- Review the admin list now and then: an admin can do anything, including deleting users.

---

## Workflows

**A hand-posted job**

```
1. Poster creates the job                       -> draft
2. Poster submits it                            -> pending (an application link or email is required)
3. Admin approves (one click)                   -> approved and published, visible on /
   (an experienced poster, 3+ approved jobs, publishes directly: approved and published at once)
4. The organiser adds labelled sections within 15 minutes
```

**An imported job** ([INGESTION.md](INGESTION.md))

```
1. The nightly import inserts it                -> pending (or rejected if the AI says reject); a trigger forces this
2. The link check deletes it if the page is dead or closed
3. An admin reviews the queue (accept first)    -> approved or rejected
4. Visible on / until its deadline; then hidden by the database and deleted by the nightly purge
   Rejected imports are deleted 30 days after rejection
5. A published job found dead or closed is hidden (job_status = 'filled') and deleted 3 days later
   (time to reactivate a wrong flag)
6. The organiser adds sections, whatever the AI verdict was
```

---

## Features

**Browsing.** Search, type and location filters, sorting, a job popup with labelled sections and a **Show original posting**
toggle, clickable links in descriptions, an **Apply** button (or **Apply by email** when only a contact email is given).

**Saved jobs.** Signed-in users bookmark jobs.

**Admin dashboard** (`/admin`, needs `is_admin`):
- *Stats:* exact counts from the database; a card opens Job Management with that filter.
- *Pending Approvals:* poster requests, and the imported-jobs queue with filters, the AI verdict and reason, and bulk Approve/Reject (up to 300 per action, with a confirmation that says how many jobs change and how many are skipped).
- *Job Management:* filter by status, type, origin and deadline; sort by newest, oldest, match, closing soonest or title; approve, reject, feature, **Edit job**, **Organise now**, delete.
- *User Management:* see all users, grant or remove admin and posting rights, delete users.

**Email verification auto-approval.** When someone verifies an email from a whitelisted university domain they are approved as a poster (`auto_approve_user_by_domain()`; `EmailVerificationHandler.tsx`). Production requires email confirmation, so an address must be owned to be approved.

**Email alerts: built but off.** The tables, matching functions and queue exist, and the profile page has an "alerts" tab showing a "coming soon" note. **No function sends the emails**: there is no queue processor. To finish it: sign up at resend.com and verify a sending domain, `supabase secrets set RESEND_API_KEY=...`, write and deploy an edge function that sends rows from `email_queue` where `sent_at IS NULL` and marks them sent, run it on a schedule (every 5 minutes), and replace the placeholder in `src/pages/Profile.tsx`. Basic account emails (confirmation, password reset) already work through Supabase Auth and are unrelated.

**Unsubscribe.** A tokenised link (`unsubscribe` function, `email_opt_out`).

---

## Security

- **Input sanitisation** (`src/lib/sanitize.ts`, DOMPurify): all user input is sanitised before storage; HTML is allowed only in job descriptions (a short whitelist); URLs must be `http(s)`; email format is checked.
- **Row-Level Security** on every table (see [Database](#database)).
- **Profiles are private.** Migration `20260815000000` dropped a policy that let anonymous visitors read every profile through the public API (it existed so the sign-up form could check an email). The sign-up form now asks `email_is_registered(email)`, which answers yes or no for one address, and also treats Supabase's "success that creates nothing" as already registered.
- **No self-promotion.** A trigger stops non-admins changing `is_admin`, `is_approved_poster`, `can_publish_directly` or `approved_jobs_count`, including by deleting and re-inserting their own profile.
- **Scheduled functions** accept only the service role key or `SCHEDULER_SECRET`, compared in constant time and never under 32 characters. They run with Supabase's JWT check off and verify the credential themselves.
- **The organiser's output is checked**: every quote must appear in the original posting, links must be `http(s)`, and the stored JSON is validated before the page shows it.
- **Security headers** (`vercel.json`): Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy, `X-XSS-Protection`. `index.html` also carries a Content-Security-Policy tag; **browsers enforce both, so keep them identical** (a mismatch blocked the fonts until 2026-11-06).
- **`delete-user` function:** JWT check, admin-only, cannot delete yourself, CORS limited to an allow-list (`ALLOWED_ORIGINS` in `supabase/functions/delete-user/index.ts`: `jobs.iscss.org`, localhost, and the old `css-jobs.andersgiovanni.com`, which can be removed). If the production domain changes, update that list.
- **Rate limiting** on auth attempts is client-side only; server-side limiting is future work.
- **Secrets** live in Supabase (`ANTHROPIC_API_KEY`, `SCHEDULER_SECRET`); `supabase/functions/.env` is gitignored.

Posting text comes from third parties, so the AI prompts treat it as data and the replies are validated strictly.

---

## Deployment

**Frontend.** Pushing to `main` deploys to Vercel in under a minute (rollback from the Deployments page). Environment
variables are in the Vercel dashboard. As of 2026-11-04 the two `VITE_SUPABASE_*` variables are scoped to **All
Environments**, so preview deployments of other branches read and write **production data**; scope them to Production
only (and give Preview a throwaway project) if that is a concern. Check a deploy by looking for the new JavaScript file
name on the live page.

**Database.** **`supabase db push` does not work against production.** Production's schema was set up before this repo
used the CLI, so its migration history lists only `20260305000000` from here plus three CSS Events migrations
(`20260305000001` to `03`) this repo does not have. `db push` stops with "Remote migration versions not found in local
migrations directory" and would otherwise try to re-run the original schema. Apply migrations with `psql`, one file or a
batch in a single transaction, using the **Session pooler** connection string (the direct connection is IPv6-only on the
free plan):

```bash
cd supabase/migrations
psql "postgresql://postgres.ukkqeczgommifgecyrez@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  -v ON_ERROR_STOP=1 --single-transaction -f 20260815000000_close_profile_email_leak.sql
```

It asks for the database password. If a file fails, nothing is applied and you can fix and rerun. Look at production first
with a read-only query (the CLI's `--read-only` flag lets an agent look without changing anything):

```bash
npx supabase db query --remote=ukkqeczgommifgecyrez --read-only "select count(*) from jobs"
```

Do not run `supabase db reset` or `db push` against production, and unlink the CLI from it when you are done
(`npx supabase unlink`), so nothing runs there by accident. In agent or CI runs the CLI asks for `--yes` before
changing a hosted project.

**Edge functions.** Name the functions you deploy; a bare `supabase functions deploy` redeploys all of them, including
`delete-user` and `unsubscribe`:

```bash
npx supabase functions deploy ingest-jobs check-listings rescore-jobs structure-jobs \
  --no-verify-jwt --remote=ukkqeczgommifgecyrez
npx supabase functions deploy delete-user --remote=ukkqeczgommifgecyrez     # verifies the user's JWT
```

**TypeScript types** (`src/integrations/supabase/types.ts`) are edited by hand. Regenerating them would drop
production-only columns (see [Schema drift](#migrations-and-schema-drift)).

---

## Production setup (one time)

Done for production on 2026-11-04. To repeat it, or to set up another project:

1. **Apply the migrations** with `psql` (not `db push`), `20260803000000` to `20260815000000`, in order. These change the live database, so review them first.
2. **Deploy the functions** (above).
3. **Set the secrets:** `ANTHROPIC_API_KEY` and a `SCHEDULER_SECRET` made with `openssl rand -hex 32`.
4. **Tell the scheduler where to call**, with the same `SCHEDULER_SECRET` value:

   ```sql
   INSERT INTO ingestion_settings (key, value) VALUES
     ('function_url', 'https://ukkqeczgommifgecyrez.supabase.co/functions/v1/ingest-jobs'),
     ('service_role_key', '<the SCHEDULER_SECRET value>')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```

   Then clear the SQL editor (it keeps a history of what you ran).
5. **Test the path** with a dry run through `net.http_post`, as the scheduler does, and read the result in `net._http_response`: 200 is good, **401 means the stored value differs from the function's secret**. To compare without revealing either value, `supabase secrets list` shows a SHA-256 digest, and `select left(encode(sha256(convert_to(value,'UTF8')),'hex'),20) from ingestion_settings where key='service_role_key'` gives the other.
6. **First import, hard checks before the AI:** call `ingest-jobs` with `{"source": "<slug>", "llm": false}` for each source in turn (one call over all sources can hit the time limit), run `check-listings` until `remaining` is 0, then `rescore-jobs` in pages until `next` is null. Details in [INGESTION.md > Running it by hand](INGESTION.md#running-it-by-hand).
7. **Confirm the schedules really ran** (below).

---

## Operating production

**Routine checks** (Supabase SQL editor). The cron log only shows that the SQL ran, so look at what it produced:

```sql
-- Did the nightly import run? (rows after 03:00 UTC; jobRxiv errors with 403)
select source_slug, status, inserted_count, started_at from scrape_runs order by started_at desc limit 12;

-- Are the schedules active, and when did each last run?
select j.jobname, j.schedule, j.active,
       (select max(d.start_time) from cron.job_run_details d where d.jobid = j.jobid) as last_run
from cron.job j order by 1;

-- Is the organiser keeping up?
select count(*) filter (where structured_at is not null) as organised,
       count(*) filter (where structure_failed_at is not null) as failed
from jobs where is_published and approval_status = 'approved';

-- What the scheduler's web calls returned (200 is good; 401 means a key mismatch)
select status_code, count(*) from net._http_response where created > now() - interval '24 hours' group by 1;
```

**Pause or resume a schedule:** `update cron.job set active = false where jobname = 'ingest-jobs-daily';` (also
`check-listings`, `purge-expired-jobs`, `structure-jobs`), then `true` to resume. Change the time with
`select cron.alter_job((select jobid from cron.job where jobname = 'ingest-jobs-daily'), schedule := '0 6 * * *');`.
Run the import now with `select public.run_job_ingestion();`.

**Rotate the scheduler secret:** make a new value (`openssl rand -hex 32`), then set it in both places in one sitting:
`supabase secrets set SCHEDULER_SECRET=<new>` and `update ingestion_settings set value = '<new>' where key = 'service_role_key';`.
Test with a dry run. Between the two changes the scheduled calls get 401, which is harmless.

**Rotate the Anthropic key:** create a new key in the Console, run `supabase secrets set ANTHROPIC_API_KEY=<new>`, then delete the old key.

**If something looks wrong**
- *No new `scrape_runs` rows:* check `net._http_response` for 401 (secret mismatch) or errors, and that `ingestion_settings` has both rows.
- *Jobs imported with no verdict:* the AI call failed (key or credits). Fix it, then run `rescore-jobs`.
- *A job has no organised sections:* it may be too new (the sweep runs every 15 minutes) or have `structure_failed_at` set (retried after 6 hours). Use **Organise now**.
- *A good job disappeared:* a published job is hidden for 3 days before deletion, so reactivate it in Job Management. An imported pending or rejected job whose page is dead is deleted by design; a person's own submission is never deleted by the link check.
- *Fonts look wrong:* check the two Content-Security-Policy definitions match ([BRANDING.md](BRANDING.md#typography)).

---

## Local development

Needs Node, and Docker Desktop for the local database.

```bash
npm install
cp .env.example .env                 # add the local or production Supabase URL and key
npx supabase start                   # database, auth and API on Docker (about a minute the first time)
npx supabase functions serve --no-verify-jwt --env-file supabase/functions/.env   # in its own terminal
npm run dev                          # http://localhost:8080
```

Local addresses: the API is `http://127.0.0.1:54321`, the database `postgresql://postgres:postgres@127.0.0.1:54322/postgres`,
Studio `http://localhost:54323`, the test inbox `http://localhost:54324`. Other commands:
`npm run build`, `npx tsc --noEmit`, `npx vitest run`, `npx eslint .`.

**A local admin.** A reset clears accounts, so recreate one (local only; these credentials are not for production):

```bash
SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")
curl -X POST "http://127.0.0.1:54321/auth/v1/admin/users" -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" -d '{"email":"admin@demo.local","password":"demo123456","email_confirm":true}'
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "UPDATE user_profiles SET is_admin=true, is_approved_poster=true WHERE email='admin@demo.local';"
```

**Resetting.** `npx supabase db reset` wipes and reapplies migrations; then recreate the admin, run an import (see
[INGESTION.md](INGESTION.md#running-it-by-hand)), and optionally `psql ... -f scripts/seed-demo-jobs.sql` for two published
demo jobs (**never against production**). To undo only approvals made while rehearsing:
`UPDATE jobs SET approval_status='pending', is_published=false WHERE is_auto_imported AND approval_status='approved';`.
Do **not** reset every imported job to pending: that would also bring back the jobs the clean-up rejected.

**Troubleshooting**

| Symptom | Cause and fix |
|---------|---------------|
| The admin page is empty | You are not signed in, or not an admin |
| "Docker daemon not running" | Open Docker Desktop, wait for it to settle, run `npx supabase start` again |
| An import returns 401 | `SRK` is empty or stale; set it again |
| An import returns "connection refused" | `functions serve` is not running |
| The public page says "No jobs found" | No published jobs; approve one, or seed the demo jobs |
| The import shows `"llm": {"enabled": false}` or a high `llmFallback` | The functions server has no key: check `supabase/functions/.env` and restart `functions serve` with `--env-file`. If the key is present, it may be wrong or out of credit |
| The link check returns many `unknown` | Some sites return 403 or 429 to the checker. `unknown` is never acted on, and it is retried after a day |

---

## Common tasks

**Add an admin.** Admin > User Management > the user's menu > **Grant Admin**. The very first one must be set in SQL:
`UPDATE user_profiles SET is_admin = true WHERE email = 'new-admin@example.com';`

**Feature a job.** Job Management > the job's menu > feature. A "Featured" badge shows in the list.

**Add a job source.** One row in `job_sources`; see [INGESTION.md > Adding a source](INGESTION.md#adding-a-source) and the candidates in [SOURCES.md](SOURCES.md#4-adding-more-sources).

**Load the university domains** (already done for production; 10,484 domains). To reload: `node scripts/generate-domains-sql.cjs`, then run the generated `supabase/seed-domains.sql` in the SQL editor. Users with those domains are approved as posters when they verify their email.

**Change the AI's definition of CSS.** Edit the prompt in `supabase/functions/_shared/llm.ts` and the keyword lists in `_shared/ingest.ts`, deploy `ingest-jobs` and `rescore-jobs`, then run `rescore-jobs` ([INGESTION.md](INGESTION.md#the-ai-verdict)).

**Change the look.** [BRANDING.md](BRANDING.md#where-it-lives-in-the-code) lists the files.

---

## Known issues and future work

**Open issues**
- **jobRxiv is not imported on production.** It answers HTTP 403 to requests from Supabase's servers (it sits behind Cloudflare; the feed works from other networks). It is the largest source: locally it gave all 5 clear matches and 33 of 55 relevant jobs. Ask jobRxiv, from ISCSS, to allow `CSSJobsBot`, which reads the public feed once a day; meanwhile its jobs can be loaded once from a network where it works. The importer does not try to evade the block.
- **Carnegie Mellon's Workday search returns HTTP 422** on every run, so it is not seeded.
- **The admin "Inactive" job status button** offers a value the database rejects (`job_status` accepts only `active` and `filled`).
- **Colour contrast:** the teal headline highlight and several small greys fail WCAG AA ([BRANDING.md > Accessibility](BRANDING.md#accessibility)).
- **Share image** is the small ISCSS logo; a 1200 by 630 image would be better, and `twitter:site` (`@cssjobs`) is unconfirmed.
- **A database rule for "how to apply"** does not exist: the forms require a link or email, but older jobs have neither, so a database rule would break edits to them.
- **Rate limiting** is client-side only.
- **Fonts load from Google** at runtime; self-hosting would remove the third-party request.
- **`supabase db push`** cannot be used on production (above), and `types.ts` cannot be regenerated.

**Built but off:** email alerts (see [Features](#features)).

**Future ideas:** more sources ([SOURCES.md](SOURCES.md)), job view analytics, user activity logs, job recommendations, social sharing, a branded dark mode, an organiser preview before approval.

---

## Migrations and schema drift

### Migrations added since October 2026

| Migration | What it does |
|-----------|--------------|
| `20260803000000_job_ingestion` | Ingestion columns, `job_sources`, `scrape_runs`, the pending-only trigger, constraints |
| `20260804000000_job_posted_at` | `posted_at` and freshness support |
| `20260805000000_schedule_ingestion` | `ingestion_settings`, `run_job_ingestion()` and the 03:00 UTC schedule |
| `20260806000000_listing_liveness` | `link_status`, `link_status_reason`, `link_checked_at` |
| `20260807000000_expire_published_jobs` | The public read rule hides jobs after their deadline |
| `20260808000000_purge_expired_jobs` | The nightly `purge_expired_jobs()` and its schedule |
| `20260809000000_rejected_retention_and_link_check_schedule` | `rejected_at` (30-day retention) and the 2-hourly link-check schedule |
| `20260810000000_ai_verdict_auto_reject` | `relevance_verdict`; the insert guard allows `rejected` |
| `20260811000000_protect_privileged_profile_columns` | Non-admins cannot change `is_admin`, `is_approved_poster`, `can_publish_directly`, `approved_jobs_count` |
| `20260812000000_seed_job_sources` | The CoMSES and Workday sources (CMU left out); safe to run twice |
| `20260813000000_structured_job_content` | `structured`, `structured_at`, `structure_failed_at`, the reset trigger, the 15-minute organiser schedule and `structure_job_now()` |
| `20260814000000_clean_comses_html` | One-time clean-up of CoMSES descriptions that still held HTML tags |
| `20260815000000_close_profile_email_leak` | Drops the policy that let anyone read every profile; adds `email_is_registered()` |

All were applied to production with `psql`. A new migration needs a new, later timestamp.

### Schema drift found while building this

Migrations reconcile three things that had drifted between the repo and production. They are `IF NOT EXISTS` or
conditional, so they do nothing on the hosted database, but without them a database built from this repo alone
does not match production:

1. **`job_type` enum.** Migrations create `'RA'`, but production and the whole frontend use `'Research Assistant'`.
2. **Missing columns** `submitted_for_approval_at`, `status_updated_at`, `status_updated_by`, `notification_sent_at`, `notification_sent_by` existed in production and the generated types but in no migration.
3. **Missing grants.** Supabase's default ACLs only cover tables created by `supabase_admin`, but migrations run as `postgres`, so every table lacked `SELECT/INSERT/UPDATE/DELETE` for `anon`, `authenticated` and `service_role`; production got them from the dashboard.

Found later:

4. **`approve_job_and_update_counter`.** The old Approve button called this function, but it is defined in no migration and exists in no database, so it always failed. Approve now updates the job directly and relies on `track_job_approval`.
5. **Migration history** does not match (above).
6. **A `ping` function** exists in production only.

**Still unreconciled** (production has these, no migration does): the `email_queue` columns `failed_at`, `failure_reason`,
`retry_count`, `max_retries`; `notification_settings.multiple_reminders`; and a table with `key` and `value` columns. This is why
`types.ts` is edited by hand: regenerating it from the local database would delete those production types. Reconcile them
before running `supabase gen types` again.

---

## History

- **December 2025.** The job board, approval workflow, email verification and saved jobs, first hosted at css-jobs.andersgiovanni.com.
- **Early 2026.** Moved to https://jobs.iscss.org and the Supabase project `ukkqeczgommifgecyrez`, shared with the new CSS Events site; an email opt-out and unsubscribe system (March).
- **October to early November 2026.** Automated ingestion, the link check, expiry and the AI relevance score; the site restyled to the ISCSS palette (navy, gold, teal) with a light layout.
- **2026-11-04.** Production launch of the automation: migrations, functions, secrets and schedules; the first import
  (153 jobs); a security fix so signed-in users cannot grant themselves admin, and so profiles are no longer public;
  the AI verdict replaced the numeric score; the organiser; admin **Edit job** and one-click approve.
- **2026-11-06.** Roles shown by capability, not the stored type; the documentation consolidated into this set; fonts and share image fixed.
