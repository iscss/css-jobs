# CSS Jobs

A job board for **computational social science (CSS)**: PhDs, postdocs, faculty positions,
research assistantships and collaborations. Run by ISCSS, the International Society for
Computational Social Science.

| | |
|---|---|
| **Live site** | https://jobs.iscss.org |
| **Sister site** | CSS Events ([repo](https://github.com/iscss/css-events)), **paused on Vercel since 2026-11-07** and no longer linked from the footer. It shares this project's Supabase database and sign-in |
| **Accounts** | Vercel and Supabase are under `admin@iscss.org` |
| **Deploys** | Pushing to `main` deploys the site to Vercel |

## What it does

- **Anyone** can browse and apply, with no account. Jobs open in a popup with labelled sections and a link to the original posting.
- **Job posters** create postings. An admin approves them, or they publish directly after three approved jobs. University email addresses are approved automatically.
- **Admins** approve, reject and edit jobs and manage users from `/admin`.
- **Automation** imports jobs from external feeds each night, checks that links are still alive, asks an AI whether each job fits CSS, and queues the results for an admin. **Nothing is published without an admin approving it.**

## Using the site

Step by step, for each kind of person. Button and menu names are the ones on screen.

### Browse and apply (no account)

1. Open https://jobs.iscss.org. The home page is the job list.
2. Search, or filter by type and location. Click a job to open its details.
3. Click **Apply**. It opens the employer's own page, or your email program when only a contact email is given.

### Create an account and sign in

1. Click **Sign in** (top right), then **Don't have an account? Sign up**.
2. Enter your name, email and a password. The password needs **12 or more characters** with an uppercase letter, a lowercase letter, a number and a symbol.
3. Open the email from the site and click the verification link (check spam). You cannot sign in until you do.
4. Return to the site and click **Sign in**. Use **Forgot password?** on that page if you lose the password.
5. Signed in, your name appears top right. Click it for **Job board**, **Profile** and **Sign out**, and **Admin dashboard** if you are an admin.

### Post a job

1. **Get posting access.** A university email address is approved automatically when you verify it. With any other address, open your name, then **Profile**, then the **Profile Settings** tab and click **Request job posting access**; an admin approves it.
2. Click **Post a job** (top right). If you do not have posting access yet, this takes you to the request page instead.
3. Fill in the form. These are required: **Job Title**, **Job Type**, **Institution**, **Location**, **Job Description**, and **an Application URL or a Contact Email** (one of the two, to submit).
4. Click **Save as Draft** to keep it unfinished, or **Submit for Approval** when it is ready. A new poster's job waits for an admin. After **3 approved jobs**, the button becomes **Publish Job** and jobs go live at once.
5. Once approved, the job shows on the home page. Find your jobs under **Profile**, then **My Jobs**.

### Get admin access

Admins review jobs and users. There is no sign-up for it; an existing admin grants it.

1. The person creates an account and **verifies their email** (see above).
2. An existing admin opens **Admin dashboard**, then the **User Management** tab, finds the person, opens the menu on their row and chooses **Grant Admin**.
3. The new admin signs out and back in. **Admin dashboard** now appears in their name menu.

For the **very first admin**, or if nobody can reach the admin page, run this once in the Supabase dashboard under **SQL Editor** (use the person's own verified address):

```sql
UPDATE user_profiles SET is_admin = true, is_approved_poster = true WHERE email = 'new-admin@example.com';
```

To remove an admin or delete an account, see [HANDBOOK > Common tasks](docs/HANDBOOK.md#common-tasks).

### Use the admin dashboard

Open your name (top right), then **Admin dashboard** (address `/admin`). It has three tabs:

- **Pending Approvals.** Jobs and people waiting for a decision. **Approve** is one click; **Reject** asks first. Imported jobs show the AI's verdict (accept, borderline or reject) and its reason, and can be approved or rejected in bulk.
- **Job Management.** Every job: filter, sort, approve, reject, feature, **Edit job**, delete.
- **User Management.** Every account: approve posters, grant or remove admin, delete users.

Nothing imported by the nightly job goes public until an admin approves it here. More on the workflow in [HANDBOOK > Workflows](docs/HANDBOOK.md#workflows) and the importer in [INGESTION.md](docs/INGESTION.md).

## Documentation

Four documents, each with one job. They link to each other for details.

| Document | Read it for |
|----------|-------------|
| **[docs/HANDBOOK.md](docs/HANDBOOK.md)** | Running and handing over the project: architecture, database, roles, security, deployment, production setup and operations, local development, known issues |
| **[docs/INGESTION.md](docs/INGESTION.md)** | The importer: sources and adapters, the AI verdict, the link check, the organiser, schedules, tests |
| **[docs/SOURCES.md](docs/SOURCES.md)** | Where jobs come from, and the wider CSS community (labs and centers, varyCSS, SICSS) as candidate sources |
| **[docs/BRANDING.md](docs/BRANDING.md)** | Colours, fonts, layout, badges, logo, accessibility, and the design reference |

Where to look for the thing you want to do:

| I want to... | Go to |
|--------------|-------|
| Run it on my computer | [Quick start](#quick-start), then [HANDBOOK > Local development](docs/HANDBOOK.md#local-development) |
| Deploy a change, or apply a database migration | [HANDBOOK > Deployment](docs/HANDBOOK.md#deployment) |
| Check that the nightly import ran, or that the sources are healthy | [INGESTION > Check that the sources are healthy](docs/INGESTION.md#check-that-the-sources-are-healthy), [HANDBOOK > Operating production](docs/HANDBOOK.md#operating-production) |
| Rotate a key or secret | [HANDBOOK > Operating production](docs/HANDBOOK.md#operating-production) |
| Add a job source | [INGESTION > How-to guides](docs/INGESTION.md#how-to-guides), candidates in [SOURCES](docs/SOURCES.md#4-adding-more-sources) |
| Change what counts as a CSS job, or edit the AI prompts | [INGESTION > Edit the AI prompts](docs/INGESTION.md#edit-the-ai-prompts) |
| Write a reader for a new kind of careers site | [INGESTION > Write a new adapter](docs/INGESTION.md#write-a-new-adapter) |
| Post a job, sign in, or get admin access | [Using the site](#using-the-site) |
| Remove an admin or delete an account | [HANDBOOK > Common tasks](docs/HANDBOOK.md#common-tasks) |
| Change colours or fonts | [BRANDING](docs/BRANDING.md) |
| Find out what is broken or unfinished | [HANDBOOK > Known issues](docs/HANDBOOK.md#known-issues-and-future-work) |

## Quick start

```bash
npm install
cp .env.example .env          # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                   # http://localhost:8080
```

```bash
npm run build                 # production build
npx vitest run                # unit tests
npx tsc --noEmit              # type check
npx eslint .                  # lint
```

The two `VITE_` values are public and come from the Supabase dashboard (**Project Settings > API**).
Secrets (the AI key, the scheduler secret) are **not** kept here: see
[HANDBOOK > Environment variables and secrets](docs/HANDBOOK.md#environment-variables-and-secrets).
For a local database, the importer and the admin screens, follow
[HANDBOOK > Local development](docs/HANDBOOK.md#local-development).

## Built with

React 18, TypeScript and Vite; Tailwind CSS with shadcn/ui and Radix UI; Supabase (PostgreSQL, Auth, Edge
Functions); React Query and React Router; the Anthropic API (Claude Haiku) for the AI steps; Vercel for hosting.
Detail in [HANDBOOK > Architecture](docs/HANDBOOK.md#architecture).

## What is where

```
src/            the site: pages, components, hooks, helpers and their tests
supabase/       edge functions (the importer, link check, organiser) and SQL migrations
docs/           the documentation above, and docs/design/ with the chosen mockup
scripts/        domain loading, safety checks, the source-address check, a demo seed (local only)
public/         static files: logos, favicon, the university-domains list
index.html      page title, share cards, Content-Security-Policy
vercel.json     security headers
```

## Working on it

Commit to `main` and push; Vercel deploys in under a minute. Run `npx vitest run` and `npm run build` first. Database changes
are new files in `supabase/migrations/` with a later timestamp, applied to production with `psql` (not `db push`; see
[HANDBOOK > Deployment](docs/HANDBOOK.md#deployment)).
