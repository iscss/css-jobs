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
│   └── lib/                # Utilities (sanitize, rate-limit, domain-loader)
├── supabase/
│   ├── functions/          # Edge functions (delete-user, unsubscribe)
│   └── migrations/         # SQL migrations
├── public/                 # Static assets (team photos, university-domains.json)
├── HANDOVER.md             # Detailed project handover (Dec 2025)
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

Deploy:
```bash
npx supabase functions deploy delete-user
npx supabase functions deploy unsubscribe
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
