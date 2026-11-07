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
| Make someone an admin | [HANDBOOK > Common tasks](docs/HANDBOOK.md#common-tasks) |
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
