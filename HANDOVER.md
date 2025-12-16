# CSS Job Board - Project Handover

**Last Updated:** December 2025
**Production URL:** https://css-jobs.andersgiovanni.com
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
│   ├── pages/           # 10 route pages (Index, Jobs, Auth, Profile, Admin, etc.)
│   ├── components/      # Organized by feature (admin/, jobs/, profile/, layout/, ui/)
│   ├── hooks/           # 15 custom React Query hooks
│   ├── contexts/        # AuthContext for session management
│   ├── integrations/    # Supabase client + auto-generated types
│   └── lib/             # Utilities (sanitize, rate-limit, domain-loader)
├── supabase/
│   ├── functions/       # Edge functions (delete-user)
│   └── migrations/      # 18 SQL migrations
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

### User Roles & Permissions

**Job Seeker** (auto-approved):
- Browse published jobs
- Save jobs to bookmarks
- Create alerts (when enabled)

**Job Poster** (requires approval):
- All job seeker features
- Create job postings (pending admin approval)
- Manage own job posts
- After 3 approved jobs → auto-publish future posts

**Admin** (manually set in database):
- All features
- Approve/reject users and jobs
- Feature jobs on homepage
- Delete users/jobs
- Access admin dashboard at `/admin`

### Job Workflow

```
1. Poster creates job → approval_status='draft', is_published=false
2. Poster clicks "Publish" → approval_status='pending'
3. Admin reviews → approval_status='approved', is_published=true
4. Job visible on /jobs page

(After 3 approved jobs, poster can publish directly)
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
- **Stats:** User count, job count, pending approvals
- **Pending Approvals:** Review and approve/reject job poster requests
- **Jobs Management:** Approve/reject jobs, feature on homepage, delete
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
**Backend:** Supabase Cloud (project ID: vbekddjiflstedhvrhwt)

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

# Apply to production
npx supabase db push --linked

# Regenerate TypeScript types
npx supabase gen types typescript --project-id vbekddjiflstedhvrhwt > src/integrations/supabase/types.ts
```

**Edge Functions:**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy delete-user
```

---

## Common Tasks

### Add a New Admin

```sql
UPDATE user_profiles
SET is_admin = true
WHERE email = 'new-admin@example.com';
```

### Feature a Job on Homepage

1. Login as admin
2. Go to Admin Dashboard → Jobs tab
3. Find job → click "Feature"
4. Job now shows in homepage carousel

### Load University Domains (5,000+)

Currently manual import needed. Data is in `public/data/university-domains.json`.

**Future:** Build admin UI to call `DomainLoader.populateDatabase()` (in `src/lib/domain-loader.ts`)

### Enable Email Alerts

1. Get Resend API key from https://resend.com
2. Add to Supabase: `supabase secrets set RESEND_API_KEY=re_xxx`
3. Uncomment alerts UI in `src/pages/Profile.tsx`
4. Deploy email queue processor edge function
5. Set up cron trigger (every 5 minutes)

---

## Known Issues & Future Work

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