# CSS Job Board - Project Handover

> **Note:** This handover document was written in December 2025 and has not been updated since. The production URL has moved from `https://css-jobs.andersgiovanni.com` to **https://jobs.iscss.org**. The Supabase project was also migrated to a new instance (`ukkqeczgommifgecyrez`). Accounts for both Vercel and Supabase are now under `admin@iscss.org`. See `README.md` for current details.

> **Update (October 2026):** Automated job ingestion was added after this document was written: jobs are imported nightly from external feeds, checked for dead links, scored for relevance by an AI model, and queued for admin approval; expired jobs are hidden and deleted automatically. The home page was also removed (`/` now redirects to `/jobs`). Sections below that are affected are marked **[updated]**. For the full picture, see `README.md` ("Automated Job Ingestion") and `INGESTION.md`.

**Last Updated:** December 2025 (ingestion notes added October 2026; production deployment and admin updates November 2026)
**Production URL:** https://css-jobs.andersgiovanni.com [now https://jobs.iscss.org]
**Status:** Production-ready, actively maintained

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your Supabase credentials to .env

# Start development server
npm run dev
# Opens at http://localhost:8080

# Build for production
npm run build
```

---

## What This Application Does

A job board for **Computational Social Science** academic positions with:

- **Two user types:**
  - Job Seekers: Browse, save, and get alerts for jobs
  - Job Posters: Create and manage job postings (requires admin approval)

- **Admin approval workflow:**
  - New job posters need approval before posting
  - Job posts need approval before going live
  - Auto-approval for verified university email domains

- **Key features:**
  - Advanced filtering (type, location, remote status)
  - Email alerts (infrastructure ready, needs Resend API key)
  - University domain whitelist (5,000+ institutions)
  - Saved jobs/bookmarks
  - Admin dashboard for user/job management

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
| **Hosting** | Vercel (frontend) + Supabase Cloud (backend) |

---

## Project Structure

```
css-jobs/
├── src/
│   ├── pages/           # Route pages (Jobs, Auth, Profile, Admin, etc.). Index is no longer routed. [updated]
│   ├── components/      # Organized by feature (admin/, jobs/, profile/, layout/, ui/)
│   ├── hooks/           # 15 custom React Query hooks
│   ├── contexts/        # AuthContext for session management
│   ├── integrations/    # Supabase client + auto-generated types
│   └── lib/             # Utilities (sanitize, rate-limit, domain-loader)
├── supabase/
│   ├── functions/       # Edge functions (delete-user, unsubscribe, ingest-jobs, check-listings) [updated]
│   └── migrations/      # SQL migrations (incl. ingestion, link checking, expiry) [updated]
├── public/              # Static assets (team photos, university-domains.json)
└── vercel.json          # Deployment config with security headers
```

---

## Environment Variables

Required in `.env`:

```env
VITE_SUPABASE_URL=https://vbekddjiflstedhvrhwt.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Get these from: [Supabase Dashboard](https://supabase.com/dashboard/project/vbekddjiflstedhvrhwt) → Settings → API

---

## Database Architecture

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `jobs` | Job postings | title, institution, location, job_type, approval_status, is_published |
| `user_profiles` | Extended user data | full_name, user_type, is_admin, is_approved_poster, approved_jobs_count |
| `saved_jobs` | User bookmarks | user_id, job_id |
| `job_alerts` | Alert configs | keywords, location, is_active (infrastructure ready) |
| `email_queue` | Email sending | recipient_email, subject, html_content, sent_at (awaiting Resend) |
| `approved_domains` | University whitelist | domain, institution_name, country |
| `job_sources` | Feeds and career sites the importer reads **[updated]** | slug, adapter, feed_url, config, max_age_days, is_active |
| `scrape_runs` | Log of each import run **[updated]** | source_slug, status, fetched_count, inserted_count, error_message |
| `ingestion_settings` | Function URL and service key for the nightly job (admin-only) **[updated]** | key, value |

`jobs` also gained, for automation: `is_auto_imported`, `source`, `source_url`, `content_hash`, `relevance_score`, `relevance_reasoning`, `posted_at`, `application_deadline`, `link_status`, `link_status_reason`, `link_checked_at`. **[updated]**

### User Roles & Permissions

**Job Seeker** (auto-approved) **[updated]:**
- Browsing and applying never needs an account: the board is public and Apply opens the employer's link
- Sign-up no longer offers the job-seeker choice; it creates poster accounts only. Older seeker accounts keep working
- Save jobs to bookmarks
- Create alerts (when enabled)

**Job Poster** (requires approval):
- All job seeker features
- Create job postings (pending admin approval)
- Manage own job posts
- After 3 approved jobs → auto-publish future posts

**Admin** (first one set in the database; then Grant Admin in User Management) **[updated]:**
- All features
- Approve/reject users and jobs (approving a job is one click; rejecting asks first)
- Edit any job from Job Management (**Edit job**), including pending ones, and redo a job's organised sections with **Organise now**
- Only admins can change `is_admin`, `is_approved_poster` and `can_publish_directly` (database trigger)
- Feature jobs (badge in the jobs list)
- Delete users/jobs
- Access admin dashboard at `/admin`

### Job Workflow

```
1. Poster creates job → approval_status='draft', is_published=false
2. Poster clicks "Publish" → approval_status='pending'
3. Admin reviews → approval_status='approved', is_published=true
4. Job visible on /jobs page

(After 3 approved jobs, poster can publish directly. The count is kept by the
`track_job_approval` database trigger. A job must have an application link or a
contact email to be submitted; a draft may be saved without one.)
```

**Imported jobs [updated]:**

```
1. Nightly import inserts job → approval_status='pending', is_published=false
   (a database trigger forces this; the code cannot publish)
2. Link check deletes it if the posting is dead or closed
3. Admin reviews the queue (sorted by AI verdict) → approved / rejected
4. Job visible on /jobs until its application_deadline, then hidden by the
   database and deleted by the nightly purge. Rejected imports are deleted 30
   days after rejection.
5. Published jobs found dead or closed are hidden (job_status='filled') and
   deleted 3 days later, which leaves time to reactivate a wrong flag
6. A published job is organised into labelled sections by the `structure-jobs`
   function (every 15 minutes), whatever the AI verdict was. The original text
   is kept and shown on request
```

---

## Key Features & Implementation

### 1. Email Verification Auto-Approval

When a user verifies their email from an approved university domain (stanford.edu, mit.edu, etc.):
- **Component:** `EmailVerificationHandler.tsx` (mounted in App.tsx)
- **Database Function:** `auto_approve_user_by_domain()`
- **Domain Data:** `public/data/university-domains.json` (5,000+ universities)
- **Status:** 15 domains manually added to DB, needs bulk import via admin UI

### 2. Email Alerts System

**Status:** Infrastructure complete, UI disabled, awaiting Resend API

**What's ready:**
- Database tables: `job_alerts`, `job_alert_matches`, `email_queue`
- Functions: `create_job_alert_matches()`, `queue_job_alert_emails()`
- Components: `JobAlerts.tsx`, `AlertSettings.tsx`
- Edge function stub: `process-email-queue/`

**To enable:**
1. Add Resend API key: `supabase secrets set RESEND_API_KEY=re_xxx`
2. Uncomment "Alerts" tab in `src/pages/Profile.tsx` (line 25-27, 58-67, 90-100)
3. Set up cron trigger for email processing
4. Test with a sample job alert

### 3. Security Features

**Input Sanitization** (`src/lib/sanitize.ts`):
- All user inputs sanitized before storage
- HTML allowed only in job descriptions (whitelist: p, br, strong, em, h1-h6, ul, ol, li)
- URLs validated (http/https only)
- Email format validation

**Row-Level Security (RLS):**
- 27 policies protecting all tables
- Users can only access own data (jobs, saved jobs, alerts)
- Admins have override access
- Public sees only published + approved jobs

**Security Headers** (vercel.json):
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict referrer policy

**Edge Function Security** (delete-user):
- JWT verification
- Admin-only access
- Self-deletion prevention
- Cascade order: profile → auth.users

### 4. Admin Dashboard

**Access:** `/admin` (requires `is_admin=true` in database)

**Features:**
- **Stats:** User count, job counts (total, published, pending review, rejected, featured; exact counts from the database; clicking a card opens Job Management with that filter selected) **[updated]**, pending approvals
- **Pending Approvals:** Review and approve/reject job poster requests, and the imported-jobs queue with filters, AI relevance scores and reasons **[updated]**
- **Jobs Management:** Filter by status (all, published, pending, rejected, draft, closed), type, origin and deadline; sort by newest, oldest, match, closing soonest or title; approve/reject, feature, delete. Both this tab and the pending queue have tick boxes plus a bulk Approve / Reject bar (max 300 per action, with a confirmation that says how many jobs are changed and skipped) **[updated]**
- **User Management:** View all users, toggle permissions, delete users

**Setting first admin:**
```sql
-- Run in Supabase SQL Editor
UPDATE user_profiles
SET is_admin = true
WHERE email = 'your-email@example.com';
```

---

## Deployment

### Current Setup

**Frontend:** Vercel (auto-deploys from `main` branch)
**Backend:** Supabase Cloud, project `ukkqeczgommifgecyrez` (shared with CSS Events). `vbekddjiflstedhvrhwt` in `supabase/config.toml` is only the local development stack's name

### Deploy Changes

**Frontend:**
1. Push to `main` branch → Vercel auto-deploys
2. Environment variables set in Vercel dashboard
3. Rollback via Vercel deployments page

**Database:**
```bash
# Create migration
npx supabase migration new add_feature_name

# Edit: supabase/migrations/YYYYMMDDHHMMSS_add_feature_name.sql

# Apply to production: use psql, NOT `db push` (production's migration history
# does not match this repo; see README.md, Deployment > Database)
psql "<session pooler string>" -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/<file>.sql

# TypeScript types are edited by hand: regenerating would drop production-only
# columns (see INGESTION.md, Schema drift)
```

**Edge Functions:**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy delete-user

# Ingestion functions are called by the scheduler with the service key,
# so the built-in JWT check is off [updated]
supabase functions deploy ingest-jobs --no-verify-jwt
supabase functions deploy check-listings --no-verify-jwt
supabase functions deploy rescore-jobs --no-verify-jwt
supabase functions deploy structure-jobs --no-verify-jwt
```
Name functions explicitly: a bare `supabase functions deploy` redeploys all of them, including `delete-user` and `unsubscribe`.

The AI steps need `ANTHROPIC_API_KEY` as a Supabase secret, and the scheduler needs `SCHEDULER_SECRET` (`supabase secrets set ...`). See `README.md` for the full production setup. **[updated]**

---

## Common Tasks

### Add a New Admin **[updated]**

Admin → User Management → the user's menu → **Grant Admin**. The very first admin
must be set in SQL:

```sql
UPDATE user_profiles
SET is_admin = true
WHERE email = 'new-admin@example.com';
```

Review the admin list now and then (Admin → User Management): an admin can do
anything, including deleting users.

### Feature a Job **[updated]**

1. Login as admin
2. Go to Admin Dashboard → Jobs tab
3. Find job → click "Feature"
4. The job gets a "Featured" badge in the jobs list. (It used to appear in a homepage carousel, but the home page has been removed.)

### Load University Domains (10,500+)

University email verification allows users with whitelisted domains to post jobs. Data is in `public/data/university-domains.json`.

**One-time setup:**
1. Generate SQL file: `node scripts/generate-domains-sql.cjs`
2. Open Supabase Dashboard → SQL Editor
3. Paste contents of generated `supabase/seed-domains.sql`
4. Click "Run"

This loads 10,500+ university domains. Users with these email addresses will be auto-approved to post jobs.

### Enable Email Alerts

1. Get Resend API key from https://resend.com
2. Add to Supabase: `supabase secrets set RESEND_API_KEY=re_xxx`
3. Uncomment alerts UI in `src/pages/Profile.tsx`
4. Deploy email queue processor edge function
5. Set up cron trigger (every 5 minutes)

---

## Known Issues & Future Work

### Ingestion: deployed to production **[updated]**

- Deployed on 2026-11-04: migrations through `20260814000000`, the four functions
  (`ingest-jobs`, `check-listings`, `rescore-jobs`, `structure-jobs`), and the
  `ANTHROPIC_API_KEY` and `SCHEDULER_SECRET` secrets. Schedules: link check every
  2 hours, import 03:00 UTC, purge 00:05 UTC, organiser every 15 minutes.
- **jobRxiv returns HTTP 403 from Supabase's servers**, so the largest source is
  not imported on production. Ask jobRxiv to allow `CSSJobsBot`, or load its jobs
  from another network. Carnegie Mellon's Workday search returns HTTP 422.
- The `pg_cron` log only shows that the SQL ran. Confirm by looking for new rows in
  `scrape_runs` each morning.
- Production's migration history does not match this repo, so `supabase db push`
  does not work; use `psql` (see `README.md`).
- Job Management's old Approve & Publish called a database function
  (`approve_job_and_update_counter`) that exists in no migration; it now updates
  the job directly. The admin "Inactive" job status button still offers a value the
  database does not allow (`job_status` accepts only `active` and `filled`).

### Infrastructure Ready But Disabled

- **Email Alerts:** Full system ready, needs Resend API key
- **Email Queue Processor:** Edge function ready, needs cron trigger

### Future Improvements

**High Priority:**
- Enable email alert system
- Load all university domains
- Add server-side rate limiting
- Fix database function search_path issues

**Medium Priority:**
- Job view analytics
- User activity logs

**Low Priority:**
- Job recommendations
- Social sharing features