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
| `user_profiles` | Users with roles (seeker, poster, admin) |
| `saved_jobs` | User bookmarks |
| `job_alerts` | Alert configs (infrastructure ready, needs Resend API) |
| `email_queue` | Email sending queue (awaiting Resend) |
| `approved_domains` | University email whitelist (5,000+ institutions) |
| `job_sources` | Feeds and career sites the importer reads (one row per source) |
| `scrape_runs` | Log of each import run: counts fetched, inserted, duplicate, stale, errors |
| `ingestion_settings` | Function URL and service key used by the nightly schedule (admin-only) |

Columns added to `jobs` for automation: `is_auto_imported`, `source`, `source_url`, `content_hash`, `relevance_score`, `relevance_reasoning`, `posted_at`, `application_deadline`, `link_status`, `link_status_reason`, `link_checked_at`.

### Admin Access

```sql
-- Set an admin in Supabase SQL Editor
UPDATE user_profiles
SET is_admin = true
WHERE email = 'new-admin@example.com';
```

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `delete-user` | Admin user deletion (cascades profile + auth, CORS-restricted to `jobs.iscss.org`) |
| `unsubscribe` | Email opt-out via tokenized link |
| `ingest-jobs` | Fetches new postings from the sources, scores them, inserts them as pending. Service-role only. |
| `check-listings` | Re-checks stored jobs' links and removes dead or closed ones. Service-role only. |

Deploy:
```bash
npx supabase functions deploy delete-user
npx supabase functions deploy unsubscribe
# Called by the scheduler with the service key, not by signed-in users,
# so the built-in JWT check is off (see supabase/config.toml). The functions
# verify the service key themselves.
npx supabase functions deploy ingest-jobs --no-verify-jwt
npx supabase functions deploy check-listings --no-verify-jwt
```

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
sources -> fetch -> clean up -> remove repeats -> keyword pre-filter -> AI score
        -> insert as pending -> link check -> admin review -> approve -> public
```

### How it works

1. **Sources.** Rows in `job_sources`: the jobRxiv feed, the CoMSES Net feed, and several university career sites on Workday. Each source names an adapter (`rss-jobrxiv`, `rss-comses`, `rss-generic`, `workday`) in `supabase/functions/_shared/adapters.ts`. Adding a source is one row if an adapter already fits.
2. **Schedule.** `pg_cron` calls `ingest-jobs` daily at 03:00 UTC. Requests identify as `CSSJobsBot` and are spaced out to stay polite to the sites.
3. **Clean up.** HTML is stripped, fields are trimmed to the database limits, job type and posting date are parsed, and stale or malformed listings are skipped.
4. **Remove repeats.** By title + institution hash, and by `source_url`, before any paid scoring.
5. **Keyword pre-filter.** A short disqualifier list (clinical, lab, marketing and similar roles) scores obvious non-CSS jobs 0 for free, so they skip the model.
6. **AI score.** The Anthropic Haiku model reads each remaining posting and returns a 0-1 CSS relevance score, a one-sentence reason (shown as "AI: ..." in the admin tooltip), and the application closing date if the posting states one. If the API is unavailable, the job keeps its keyword score and ingestion continues.
7. **Insert as pending.** The `trg_imported_jobs_pending` trigger forces every imported job to `pending` and unpublished, so a bug in the code cannot publish anything.
8. **Admin review.** The `/admin` queue is sorted by score. Scores only order the queue.

### Safety guarantee

Imported jobs are hidden from the public by Row-Level Security at the database level, not by the UI. The checks in `scripts/verify-ingestion.sh` confirm this (anonymous API requests return no imported jobs, the trigger cannot be bypassed, the ingest endpoint rejects the anon key).

Posting text comes from third parties, so the scoring prompt treats it as data and the model's reply is validated strictly. The reply is only a number, a sentence, and a date.

### Expiry and cleanup

- **Closing date.** When a posting states one, it is stored in `application_deadline`. The public read rule hides a job after that date (a job stays visible through the deadline day, UTC), with no polling.
- **Nightly purge.** `purge_expired_jobs()` runs at 00:05 UTC and deletes jobs past their deadline, published or not.
- **Link check.** `check-listings` visits each job's link (`source_url`, or `application_url` for hand-posted jobs). It treats HTTP 404/410, a redirect to the site's homepage, a visible "listing has expired" notice, a past `validThrough` date, or a Workday posting that can no longer be applied to as gone. A blocked or timed-out request is "unknown" and never acted on.
  - Pending jobs found gone are deleted.
  - Published jobs found gone are hidden at once (`job_status = 'filled'`) and deleted by the purge 3 days later, which leaves time for an admin to reactivate one that was flagged by mistake.
  - Published jobs are rechecked every few days, pending jobs weekly. The link check is not yet on a schedule: run it by hand (below) or add a cron entry like the ingestion one.

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

1. Apply the migrations (`npx supabase db push`): `job_ingestion`, `job_posted_at`, `schedule_ingestion`, `listing_liveness`, `expire_published_jobs`, `purge_expired_jobs`. These change the live database, so review them first.
2. Deploy the two functions (see [Edge Functions](#edge-functions)).
3. Set `ANTHROPIC_API_KEY` as a Supabase secret (see [Environment Variables](#environment-variables)).
4. Store the function URL and service role key for the nightly job:

```sql
INSERT INTO ingestion_settings (key, value) VALUES
  ('function_url', 'https://ukkqeczgommifgecyrez.supabase.co/functions/v1/ingest-jobs'),
  ('service_role_key', '<service role key>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

5. Test once with `SELECT public.run_job_ingestion();`, then check `scrape_runs` and the admin queue.

### Tests and cost

- `npx vitest run` covers the pure logic (feed parsing, normalization, scoring parser, deadline handling, link classification) with the network mocked.
- `./scripts/verify-ingestion.sh` runs the database-level safety checks against the local stack.
- AI scoring costs a small fraction of a cent per new job, and unchanged or already-seen jobs cost nothing. Check real spend on the Anthropic console's usage page for the workspace.

### Known limitations

- Most postings state no closing date, so they stay up until the link check finds them closed.
- Some Workday sites (UChicago, OSU, Cornell, UMD, Wisconsin) sometimes return HTTP 403 to the link check; those jobs stay "unknown" and unchecked.
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
- **Ingestion endpoints** — `ingest-jobs` and `check-listings` accept only the service role key (the anon key is rejected); imported jobs are forced to `pending` by a database trigger
- **Secrets** — `ANTHROPIC_API_KEY` is a Supabase secret; `supabase/functions/.env` is gitignored
