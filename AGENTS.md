# AGENTS.md

Comprehensive guidance for Agents when working with the CSS Job Board codebase.

## Project Overview

**CSS Job Board** - Full-stack job posting platform for Computational Social Science academic positions with user authentication, job management, admin capabilities, and approval workflows.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Security**: DOMPurify + Row-Level Security (RLS)

### Key Features
- Dual user types (job seekers/posters) with role-based permissions
- Job approval workflow with admin dashboard
- Advanced filtering (type, location, region, remote)
- Email alert system (infrastructure ready)
- University domain whitelist (5000+ institutions)
- Input sanitization and audit trails

---

## Quick Start

### Commands
```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # Check code quality
npm run preview      # Preview production build
```

### Project Structure
```
css-jobs/
├── src/
│   ├── pages/              # 9 route pages
│   ├── components/
│   │   ├── admin/          # Admin dashboard (6)
│   │   ├── jobs/           # Job components (8)
│   │   ├── profile/        # User dashboard (6)
│   │   ├── layout/         # Navigation (5)
│   │   └── ui/             # shadcn components (50+)
│   ├── hooks/              # Custom hooks (15)
│   ├── contexts/           # AuthContext
│   ├── integrations/       # Supabase client & types
│   └── lib/                # Utilities (sanitize, domain-loader)
├── supabase/
│   ├── functions/          # Edge functions (2)
│   └── migrations/         # SQL migrations (18)
└── public/                 # Static assets
```

---

## Architecture

### Application Flow
```
User → React Router → Page → Custom Hooks → Supabase → PostgreSQL + RLS
                              ↓
                        AuthContext (session)
                              ↓
                        React Query (cache)
```

### Routes
| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | Index | Public | Homepage with featured jobs |
| `/jobs` | Jobs | Public | Browse all jobs with filters |
| `/auth` | Auth | Unauthenticated | Login/signup |
| `/post-job` | PostJob | Approved Poster | Job creation form |
| `/profile` | Profile | Authenticated | User dashboard |
| `/admin` | Admin | Admin | Admin control panel |
| `/about` | About | Public | Team information |
| `/email-verified` | EmailVerified | Authenticated | Verification confirmation |

### State Management
- **Server State** (React Query): Job listings, profiles, admin data (5min stale time)
- **Client State** (Context): AuthContext for user session only
- **Cache Keys**: Hierarchical - `['jobs']`, `['user-jobs', userId]`, `['admin-*']`

---

## Database Schema

### Core Tables

#### **jobs** (Main job listings)
**Purpose**: Job postings with approval workflow

**Key Columns**:
- `id`, `title`, `institution`, `department`, `location`, `job_type`
- `description`, `requirements` (rich text)
- `application_deadline`, `duration`, `application_url`, `contact_email`
- `posted_by` (FK → user_profiles)
- `is_remote`, `is_featured`, `is_published` (booleans)
- `approval_status` (draft/pending/approved/rejected)
- `job_status` (active/filled/inactive/expired)
- `approved_by_admin` (FK → user_profiles)

**RLS**:
- SELECT: Anyone sees published+approved+active OR own jobs OR admins see all
- INSERT: Only approved posters
- UPDATE/DELETE: Owner OR admin

---

#### **user_profiles** (User data)
**Purpose**: Extended user info beyond auth.users

**Key Columns**:
- `id` (PK, FK → auth.users CASCADE)
- `full_name`, `institution`, `email`, `orcid_id`, `google_scholar_url`, `website_url`
- `user_type` (job_seeker/job_poster)
- `approval_status` (pending/approved/rejected)
- `is_admin`, `is_approved_poster` (permissions)
- `can_publish_directly` (skip approval for experienced posters)
- `approved_jobs_count` (reputation tracking)

**RLS**:
- SELECT: Public profiles + own + admins see all
- UPDATE: Own profile + admins any
- DELETE: Admin only

**Auto-created via trigger on auth.users INSERT**

---

#### **saved_jobs** (Bookmarking)
**Key Columns**: `user_id`, `job_id`, `created_at`
**PK**: (user_id, job_id) - prevents duplicates
**RLS**: User owns all operations (`user_id = auth.uid()`)

---

#### **job_tags** (Many-to-many)
**Key Columns**: `id`, `job_id` (CASCADE), `tag`
**RLS**: Anyone reads, owner writes

---

#### **job_alerts** (Alert config) - *Infrastructure ready, UI disabled*
**Key Columns**: `id`, `user_id`, `keywords`, `location`, `is_active`
**RLS**: User owns all operations

---

#### **email_queue** (Email tracking) - *Ready for Resend integration*
**Key Columns**: `id`, `recipient_email`, `subject`, `html_content`, `template_type`, `sent_at`, `failed_at`, `retry_count`

---

#### **approved_domains** (University whitelist)
**Key Columns**: `id`, `domain`, `institution_name`, `country`
**Data**: 5000+ universities from `public/data/university-domains.json`
**RLS**: Anyone reads, admin writes

---

### Database Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `handle_new_user()` | auth.users INSERT | Auto-create user_profile |
| `get_admin_user_profiles()` | RPC | Admin fetch all profiles with auth data |
| `job_matches_alert(job, alert)` | RPC | Check keyword/location match |
| `create_job_alert_matches()` | jobs INSERT (published) | Auto-create alert matches |

---

### RLS Security Patterns

**⚠️ Performance Issue**: Replace `auth.uid()` with `(SELECT auth.uid())` in all policies to prevent per-row re-evaluation.

**Common Patterns**:
```sql
-- 1. User Isolation
USING (user_id = auth.uid())

-- 2. Admin Override
USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true))

-- 3. Public Read + Owner Write
USING (is_published = true AND approval_status = 'approved')  -- Public
USING (posted_by = auth.uid())  -- Owner

-- 4. Conditional Insert
WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_approved_poster = true))
```

---

## Authentication & Authorization

### Auth Flow
- **Provider**: Supabase Auth (Email/Password)
- **Sign Up**: email + password → auth.users → trigger creates user_profile → email verification → approval
- **Sign In**: credentials → JWT → localStorage → auto-refresh
- **Sign Out**: 'local' scope → clear localStorage → redirect home

### User Types & Approval
```typescript
type UserType = 'job_seeker' | 'job_poster';
```

**Job Seeker**: Auto-approved after email verification
**Job Poster**: Requires admin approval → `is_approved_poster = true` → can create jobs

### Protected Routes
**Client Guards**: useEffect + navigate (PostJob, Admin)
**Server Guards**: RLS policies

### Admin Pattern
```typescript
const { data: isAdmin } = useAdminCheck();  // Cached 5min
if (!isAdmin) return <AccessDenied />;
```

---

## Component Reference

### Pages (src/pages/)

| Page | Purpose | Auth | Key Components |
|------|---------|------|----------------|
| Index | Homepage | Public | HeroSection, FeaturedJobs, StatsSection |
| Jobs | Job browsing + filters | Public | JobFilters, CompactJobCard, JobDetailsModal |
| Auth | Login/signup | Unauthenticated | Combined form with tabs |
| PostJob | Job creation | Approved Poster | JobPostingForm |
| Profile | User dashboard | Authenticated | SavedJobs, MyJobPosts, UserProfile |
| Admin | Admin panel | Admin | PendingApprovalCard, UserManagementTable, JobManagementTable |
| About | Team info | Public | Static content |
| EmailVerified | Post-verification | Authenticated | EmailVerificationHandler |

### Admin Components (src/components/admin/)

| Component | Purpose |
|-----------|---------|
| AdminStats | Dashboard metrics (users, jobs, approvals) |
| UserManagementTable | View/edit users, toggle permissions, delete |
| JobManagementTable | Manage all jobs, approve/reject, feature |
| PendingApprovalCard | User approval request display |
| PendingJobApprovalCard | Job approval request display |
| UserProfileModal | Detailed user profile view |

### Job Components (src/components/jobs/)

| Component | Purpose | Usage |
|-----------|---------|-------|
| JobPostingForm | Complete job creation/edit form (500+ lines) | PostJob page, edit modals |
| JobCard | Featured job card (large) | Homepage carousel |
| CompactJobCard | Condensed job listing | Jobs page list |
| JobDetailsModal | Full job details modal | Clicked from cards |
| EditJobModal | Admin in-place editing | Admin dashboard |
| JobFilters | Advanced filtering UI | Jobs page sidebar |
| FeaturedJobs | Embla carousel component | Homepage |
| DeleteJobModal | Confirmation dialog | MyJobPosts, admin |

### Profile Components (src/components/profile/)

| Component | Purpose |
|-----------|---------|
| UserProfile | Profile settings form |
| MyJobPosts | Posted jobs management table |
| SavedJobs | Bookmarked jobs list |
| JobAlerts | Alert config (Coming Soon - disabled) |

### Layout Components (src/components/layout/)

| Component | Purpose |
|-----------|---------|
| Header | Main navigation (sticky) |
| Footer | Site footer |
| AuthButton | Sign in/out + user menu dropdown |
| PostOpportunitiesModal | CTA for job posting |
| SignupPromptModal | Feature gating for unauth users |

---

## Custom Hooks Reference

### Job Management Hooks (src/hooks/)

| Hook | Purpose | Auth | Cache Key |
|------|---------|------|-----------|
| `useJobs()` | Public published jobs | Public | `['jobs']` |
| `useCreateJob()` | Create job posting | Approved Poster | - |
| `useUserJobs()` | Current user's jobs | Authenticated | `['user-jobs', userId]` |
| `useUserJobsAdmin(userId)` | Admin view user jobs | Admin | `['user-jobs-admin', userId]` |
| `useAllJobs()` | All jobs (any status) | Admin | `['all-jobs-admin']` |
| `usePendingJobs()` | Jobs awaiting approval | Admin | `['pending-jobs-admin']` |
| `useRetractJob()` | Publish/unpublish job | Owner/Admin | - |
| `useToggleFeatured()` | Feature/unfeature job | Admin | - |
| `useUpdateJobStatus()` | Change job_status | Owner/Admin | - |
| `useDeleteJob()` | Admin delete any job | Admin | - |
| `useDeleteJobUser()` | User delete own job | Owner | - |

### User Management Hooks

| Hook | Purpose | Auth | Cache Key |
|------|---------|------|-----------|
| `useUserProfile()` | Current user profile | Authenticated | `['user-profile', userId]` |
| `useUpdateUserProfile()` | Update own profile | Authenticated | - |
| `useAdminCheck()` | Check if user is admin | Authenticated | `['admin-check', userId]` (5min) |
| `useAdminUserProfiles()` | All profiles + auth data | Admin | `['admin-user-profiles']` |
| `useAdminApprovals()` | Pending user approvals | Admin | `['admin-approvals']` |
| `useUpdateApprovalStatus()` | Approve/reject user | Admin | - |
| `useUpdateUserPermissions()` | Toggle admin/poster flags | Admin | - |
| `useDeleteUser()` | Delete user via edge function | Admin | - |

### Job Interaction Hooks

| Hook | Purpose | Auth | Cache Key |
|------|---------|------|-----------|
| `useSavedJobs()` | User's bookmarked jobs | Authenticated | `['saved-jobs', userId]` |
| `useSaveJob()` | Bookmark a job | Authenticated | - |
| `useUnsaveJob()` | Remove bookmark | Authenticated | - |
| `useCheckSavedJob(jobId)` | Check if job saved | Authenticated | `['check-saved-job', userId, jobId]` |
| `useJobAlerts()` | User's alerts (disabled) | Authenticated | - |
| `useCreateJobAlert()` | Create alert (disabled) | Authenticated | - |

---

## Key Workflows

### 1. User Registration & Approval

**Job Seeker**:
1. Navigate to /auth → fill signup form (email, password, full_name, user_type='job_seeker')
2. Supabase creates auth.users → trigger creates user_profile → email verification sent
3. Click verification link → EmailVerificationHandler sets approval_status='approved'
4. User can log in and browse jobs

**Job Poster**:
1-2. Same as job seeker but user_type='job_poster' → approval_status='pending'
3. Admin sees user in Pending Approvals tab → reviews → clicks Approve
4. is_approved_poster=true → user can now create jobs

---

### 2. Job Posting Workflow

**Create Job**:
1. Navigate to /post-job (guard: is_approved_poster required)
2. Fill JobPostingForm → client validation (React Hook Form) → sanitization
3. Submit → useCreateJob() mutation → job created with:
   - approval_status='draft', is_published=false, job_status='inactive'
4. User sees job in "My Job Posts" as draft

**Admin Approval**:
1. Admin → Dashboard → Jobs tab (pending) → sees PendingJobApprovalCard
2. Reviews details → clicks Approve:
   - approval_status='approved', approved_at=now(), job_status='active'
3. Job now visible to public (if is_published=true)

**Publish Job**:
1. User → My Job Posts → clicks "Publish" on approved job
2. useRetractJob(isPublished: true) → is_published=true, job_status='active'
3. Job now visible on /jobs

---

### 3. Job Browsing & Filtering

1. Navigate to /jobs → useJobs() fetches published+approved+active jobs
2. Jobs displayed as CompactJobCard grid
3. Client-side filtering: search, job type, remote, region, country
4. Click job → JobDetailsModal opens with full details + save button

**Location Mapping** (Client-Side):
```typescript
const locationToRegion: Record<string, string> = {
  "United States": "north-america",
  "United Kingdom": "europe",
  "Australia": "oceania",
  // ... 30+ countries
};
```

---

### 4. Admin Dashboard Workflow

**Access**: Navigate to /admin → guard checks is_admin → show dashboard or redirect

**Pending Approvals Tab**:
1. useAdminApprovals() fetches pending users
2. Display PendingApprovalCard for each
3. Approve/Reject → useUpdateApprovalStatus() → sets approval_status, is_approved_poster

**Jobs Tab**:
1. usePendingJobs() fetches pending jobs
2. Display PendingJobApprovalCard for each
3. Approve/Reject/View Details → updates approval_status

**Users Tab**:
1. useAdminUserProfiles() fetches all users with auth data
2. Display UserManagementTable
3. Actions: toggle admin/poster status, view jobs, delete user

**Stats Tab**: Computed metrics from admin queries

---

### 5. Saved Jobs Workflow

**Save Job**:
1. Click "Save" on JobCard/JobDetailsModal → check auth (SignupPromptModal if not)
2. useSaveJob() → INSERT INTO saved_jobs → button disabled → toast notification

**View Saved**:
1. Navigate to /profile → Saved Jobs tab
2. useSavedJobs() fetches → display CompactJobCard for each
3. "Remove" button → useUnsaveJob()

---

## Security Patterns

### Input Sanitization (src/lib/sanitize.ts)

**Library**: DOMPurify

**Functions**:
```typescript
sanitizeHtml(dirty)      // Allowlist: p, br, strong, em, u, h1-h6, ul, ol, li
sanitizeText(text)       // Strip all HTML
sanitizeUrl(url)         // Validate protocol (http/https only)
sanitizeEmail(email)     // Format validation
sanitizeInput(input, maxLength)  // General with length limit
```

**Usage in JobPostingForm**:
```typescript
const onSubmit = async (data: JobFormData) => {
  const sanitizedJob = {
    title: sanitizeInput(data.title, 200),
    description: sanitizeHtml(data.description),
    application_url: data.application_url ? sanitizeUrl(data.application_url) : null,
    contact_email: data.contact_email ? sanitizeEmail(data.contact_email) : null,
    // ...
  };
};
```

---

### Edge Function Security (delete-user)

**Multi-layer checks**:
1. CORS + OPTIONS handling
2. JWT verification → extract user from token
3. Admin check → query user_profiles.is_admin
4. Input validation → userId required
5. Self-deletion prevention → userId !== user.id
6. Admin-deletion prevention → target user not admin
7. Cascade deletion → profile first, then auth.users

---

### XSS Prevention

**Strategy**: Sanitize all inputs before storage, render safely

**Input**: All form fields sanitized via sanitize.ts functions
**Output**: React auto-escapes text, dangerouslySetInnerHTML only for pre-sanitized HTML

---

### SQL Injection Prevention

**Strategy**: Supabase client uses parameterized queries automatically

```typescript
// SAFE - automatically parameterized
await supabase.from('jobs').select('*').eq('id', jobId);

// NEVER - string concatenation
await supabase.rpc('execute_sql', { sql: `SELECT * FROM jobs WHERE id = '${jobId}'` });
```

---

### Authentication Security

**Password Policy**: Default Supabase (min 6 chars - should increase)
**Session**: JWT in localStorage, auto-refresh, 'local' scope sign out
**Email Verification**: Required by default
**Rate Limiting**: Supabase default limits

---

## Supabase Functions & Migrations

### Edge Functions (supabase/functions/)

**Current Functions**:

1. **delete-user/** - Admin user deletion
   - **Purpose**: Secure cascade deletion of users from both user_profiles and auth.users
   - **Auth**: Admin only (verified via JWT + is_admin check)
   - **Security Layers**:
     - JWT validation
     - Admin permission check
     - Self-deletion prevention
     - Admin-to-admin deletion prevention
     - Cascade order: profile first → auth.users
   - **Endpoint**: POST with `{ userId: string }`
   - **Status**: Active, deployed

2. **process-email-queue/** - Email queue processor (stub)
   - **Purpose**: Process email_queue table for sending alerts/notifications
   - **Status**: Infrastructure ready, awaiting Resend integration
   - **Note**: Directory exists but implementation pending

### Database Migrations (supabase/migrations/)

**Migration History** (18 files):

| Migration | Date | Purpose |
|-----------|------|---------|
| `20250702140543-...` | Initial | Schema setup: jobs, user_profiles, job_tags, enums |
| `20250703054706-...` | Jul 3 | Add user_type, approval_status columns |
| `20250703061151-...` | Jul 3 | RLS policy refinements |
| `20250703061200-fix-rls-policies` | Jul 3 | Fix RLS policies |
| `20250703061300-fix-infinite-recursion` | Jul 3 | Fix recursive policy issues |
| `20250805110317-...` | Aug 5 | Schema updates |
| `20250806143554-...` | Aug 6 | RLS sensitive data restrictions |
| `20250807085930-...` | Aug 7 | Update 'both' user types to 'job_poster' |

**Key Changes**:
- Initial schema with job posting workflow
- User approval system (job_seeker/job_poster)
- RLS policy optimization and security hardening
- Cleanup of deprecated user_type values

---

## Development Guidelines

### Creating Database Migrations

**Using Supabase CLI** (Recommended):

```bash
# Install Supabase CLI globally (if not installed)
npm install -g supabase

# Generate a new migration file
npx supabase migration new <migration_name>

# Example:
npx supabase migration new add_user_ratings_table

# This creates: supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
```

**Migration File Structure**:
```sql
-- Description: What this migration does
-- Date: YYYY-MM-DD

-- Create table
CREATE TABLE public.example_table (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_example_user_id ON public.example_table(user_id);

-- Enable RLS
ALTER TABLE public.example_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own records"
ON public.example_table
FOR SELECT
USING (user_id = auth.uid());
```

**Best Practices**:
1. **One concept per migration** - Don't mix schema changes with data migrations
2. **Always include RLS** - Enable RLS and create policies immediately
3. **Add indexes** - Create indexes for foreign keys and frequently queried columns
4. **Test locally first** - Run migration on local Supabase before pushing
5. **Descriptive names** - Use clear migration names: `add_`, `update_`, `fix_`, `remove_`
6. **Regenerate types** - After migration, update TypeScript types

**Applying Migrations**:
```bash
# Apply locally (via Supabase CLI)
npx supabase db push

# Apply to production (via Supabase Dashboard or CLI)
npx supabase db push --linked
```

**After Migration Checklist**:
1. Regenerate TypeScript types (see below)
2. Update affected hooks/queries
3. Test RLS policies manually
4. Verify indexes are created
5. Check for performance impact

---

### Adding a New Feature

1. **Database**: Create migration using `npx supabase migration new <name>` → add table + RLS + indexes
2. **Types**: Regenerate via `npx supabase gen types typescript --project-id vbekddjiflstedhvrhwt > src/integrations/supabase/types.ts`
3. **Hooks**: Create custom hooks in `src/hooks/` using React Query
4. **Components**: Build UI in `src/components/feature/`
5. **Routes**: Add to `src/App.tsx` if needed
6. **Navigation**: Update `src/components/layout/Header.tsx`
7. **Test**: Manual testing of CRUD + RLS + auth guards

### Code Style

- **TypeScript**: Use generated types, no `any`, prefer interfaces
- **React**: Functional components, hooks, keep <300 lines
- **Naming**: PascalCase (components), camelCase (functions/hooks), UPPER_SNAKE_CASE (constants)
- **Files**: One component per file, absolute imports with `@/`
- **Comments**: JSDoc for public functions, explain "why" not "what"

---

## Troubleshooting

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "User must be authenticated" errors | Auth session expired | Check AuthContext loading state before rendering |
| RLS policy violations (403) | User lacks permission | Check is_approved_poster/is_admin flags in user_profiles |
| Jobs not visible after publishing | Wrong status flags | Verify is_published=true, approval_status='approved', job_status='active' |
| React Query cache not updating | Missing invalidation | Add queryClient.invalidateQueries() in mutation onSuccess |
| Edge function 401/403 | Invalid token or not admin | Check user logged in + is_admin=true + edge function deployed |
| TypeScript errors after DB changes | Types out of sync | Regenerate types + restart TS server |

### Debugging Tools

- **React Query Devtools**: Add `<ReactQueryDevtools />` to App.tsx
- **Supabase Logging**: Log query results with `.then(({ data, error }) => console.log(...))`
- **Browser DevTools**: Network tab (API calls), Console (errors), React DevTools (state), Application tab (localStorage)

---

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Query**: https://tanstack.com/query/latest
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## GitHub Workflow

Standard practices: feature branches from `main`, PRs for review, conventional commits.

```bash
gh issue create --title "Title" --body "Description"
gh pr create --title "feat: Feature" --body "Description"
gh pr list --state open
gh pr merge 123 --squash
```

---

**Last Updated**: October 2025
**Version**: 1.0.0
