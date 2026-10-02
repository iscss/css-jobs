# Demo Script — Automated Job Ingestion

**Runtime:** ~8 minutes. **Setup:** ~5 minutes before anyone is watching.

The one thing to land: *jobs arrive automatically, but a human decides what
goes live.*

---

# PART 1 — Setup (before anyone is watching)

## 1.1 Start the three services

Open three terminal tabs. Each command keeps running — don't close them.

```bash
# Terminal 1 — database + API
npx supabase start
```
Wait for the block of URLs and keys. ~30 seconds (longer on first run).

```bash
# Terminal 2 — the import function
npx supabase functions serve --no-verify-jwt
```
Wait for `Serving functions on http://127.0.0.1:54321/functions/v1/<function-name>`.

```bash
# Terminal 3 — the website
npm run dev
```
Wait for `VITE ready` and `http://localhost:8080/`.

Open a **fourth** terminal for the commands you'll run during the demo.

## 1.2 Health check

In terminal 4:

```bash
./scripts/verify-ingestion.sh
```

Expect **13 passed, 0 failed**. If anything fails, jump to Troubleshooting.

## 1.3 Check the starting state

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tAc \
  "SELECT 'pending: '||count(*) FROM jobs WHERE approval_status='pending';
   SELECT 'published: '||count(*) FROM jobs WHERE is_published;"
```

You want:
- **published: 2** — two hand-posted jobs so the public board looks real
- **pending:** anything in the low hundreds (it drifts as jobRxiv posts more)

**Write the pending number on a sticky note.** You'll say it out loud twice.

If published is not 2, run the Full Reset in Troubleshooting.

## 1.4 Prepare the import command

Paste this into terminal 4 but **don't run it yet** — it's for Step 5:

```bash
SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

curl -s -X POST "http://127.0.0.1:54321/functions/v1/ingest-jobs" \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

Increase your terminal font size now (Cmd +, three or four times).

## 1.5 Set up browser tabs

| Tab | URL | Window |
|-----|-----|--------|
| 1 | http://localhost:8080/admin | Normal |
| 2 | http://localhost:8080/jobs | Normal |
| 3 | http://localhost:8080/jobs | **Private/Incognito** (Cmd+Shift+N) |

**Sign in on tab 1 now:** go to http://localhost:8080/auth, enter
**admin@demo.local** / **demo123456**, then navigate to `/admin`.

You should see the **Pending Approvals** tab with a red count badge, and job
cards below the heading "Pending Job Approvals".

Leave tab 3 signed out — that's the whole point of it.

**Final check:** tab 1 shows ~150 pending jobs, tab 3 shows exactly 2 jobs.
That gap is the demo.

---

# PART 2 — The demo

## Step 1 — The problem (30 seconds, no screen)

Don't share your screen yet. Just talk.

> "Right now, every job on the board is posted by hand. Someone finds a
> posting, copies the title, institution, location, description, and deadline,
> and types it in. That takes a few minutes per job, and it means we only ever
> list what someone happened to see.
>
> So I built something that finds these automatically. But before I show you: a
> human still approves every single job before it appears on the site. Nothing
> the system finds goes live on its own."

*Why: state the safety property before showing the automation. Otherwise the
first question is "wait, is it posting things without us?" and you're defensive
for the rest of the demo.*

Now share your screen.

## Step 2 — Show the review queue (1.5 minutes)

**Go to tab 1** (`/admin`), Pending Approvals tab.

**2a. The scale.** Point at the count badge next to "Pending Job Approvals".

> "This is the review queue. There are about [your number] jobs waiting, all
> pulled in automatically from jobRxiv — an academic job board that publishes a
> feed of postings."

**2b. One card in detail.** Point at the top card and walk through its parts:

- **"Auto-imported" badge** (blue, with a robot icon)
  > "This tells you it came from a feed, not a person."
- **Match percentage** (green badge, top right, e.g. "50% match")
  > "How likely this is computational social science."
- **"View original" link**
  > "Goes straight to the real posting, so you can check it's genuine before
  > approving."

**2c. Optional — hover the match badge.** A tooltip shows which keywords fired
(e.g. `social reinforcement (+0.35), computational (+0.15)`).

> "It'll tell you why it scored the way it did."

**2d. The important point — scroll down.** Scroll a long way, past dozens of
cards, until scores are 0%. Land on something clearly unrelated — a lab
technician or clinical role.

> "Here's the thing I want to be clear about. This one scored zero — it's a lab
> role, nothing to do with social science. But it's still here. It wasn't
> deleted or filtered out.
>
> The scoring only decides what you look at *first*. Everything the system
> finds stays in the queue. If the scoring is wrong about something, you'd
> still see it — it'd just be further down."

*Why this matters: it's the answer to "what if the AI throws away a good job?"
Answering before it's asked is much stronger than answering after.*

Scroll back to the top.

## Step 3 — Prove the public can't see them (1 minute)

**This is the most important step. Slow down.**

**Switch to tab 3 — the private window** on `/jobs`.

> "Now this is the public job board. This is a private window — I'm not logged
> in, so this is exactly what any visitor sees."

Point at the two jobs listed (Amsterdam and ETH Zurich).

> "Two jobs. Those were posted by people, the normal way.
>
> Meanwhile there are about [your number] imported jobs sitting in the database
> right now — and not one of them is here."

**Pause. Let it sit for two or three seconds.**

> "That's not the page hiding them from view. Those jobs are invisible at the
> database level. Even if someone queried the database directly, they wouldn't
> get them back. They cannot appear on this site until an admin approves them."

*If you want a stronger version:* switch between tab 3 (2 jobs) and tab 1 (150
pending) two or three times. The visual gap does the work.

## Step 4 — Approve one job, live (1.5 minutes)

**Back to tab 1** (`/admin`).

**4a.** Find the top card — *Postdoctoral Fellow in Social Reinforcement
Learning*, Max Planck Institute, 50% match.

> "Let's say I've reviewed this one and it looks good."

**4b.** Optionally click **View** first to show the full description, then close
the modal.

**4c.** Click the green **Approve** button (right-hand side of the card).

**4d.** A dialog appears: *"Are you sure you want to approve the job post…?
This will publish the job to the job board."*

> "It confirms, because this is the step that makes it public."

Click **Approve Job**.

**4e.** The card disappears from the queue and a success toast appears.

**4f. Switch to tab 3 and refresh** (Cmd+R).

> "And there it is. Three jobs now — the two that were already there, plus the
> one I just approved."

Point at the newly added Max Planck posting.

> "One job went live because I approved it. The other ~149 are still sitting in
> the queue, still invisible, waiting for someone to look at them."

*This before/after is what convinces people the approval gate is real. Everything
else is supporting detail.*

## Step 5 — Run an import live (1.5 minutes)

**Switch to terminal 4.** Run the prepared command.

> "This is the import itself. In production it would run on a schedule —
> once a day, overnight. I'm running it by hand so you can see what it does."

It takes 10–20 seconds. Point at the output:

```json
"fetched": 100,
"inserted": 0,
"duplicates": 100,
"skipped": 0
```

> "It fetched 100 jobs from the feed and inserted zero of them — it recognised
> every one as already imported. That's the deduplication working. You can run
> this every day and it won't create duplicates."

**If `inserted` is not 0** — that's fine, and arguably a better story:

> "It found some new postings this time — those got added. The ones it had
> already seen were skipped as duplicates."

*(This genuinely happened in preparation: a run 15 hours later brought in 50 new
jobs and correctly skipped the 50 it already had.)*

**Optional** — scroll up in the output to the `samples` array showing the
highest-scoring listings from this run.

## Step 6 — Where it's going (1.5 minutes)

Stop sharing, or switch back to the admin queue as a backdrop.

**What works now:**
- Automatic import from jobRxiv, deduplicated and ranked by relevance
- Human approval enforced by the database, not just the interface
- New sources can be added with a single database row — no code changes

**What isn't built yet:**
- Scheduling — runs are manual today
- Only jobRxiv is connected
- Nothing is deployed; this is all running on my laptop

**On sources — be straight about this:**
> "I checked several. jobRxiv works well. Euraxess turned out to have no public
> way to read their listings — their system is for posting *to* them. HigherEdJobs
> blocks automated access. jobs.ac.uk changed their feeds and the documented URLs
> are dead. So each new source is its own small piece of work, and I'd prioritise
> the aggregators that cover many universities at once."

**On cost:**
> "Nothing so far. The relevance ranking uses keyword matching, which is free.
> Using an AI model would rank better — around one to three dollars a month —
> but I'd rather run it as-is for a few weeks and see whether the ordering is
> actually good enough first."

**Close with the ask** — whatever you need: approval to deploy, a decision on
sources, or time to continue.

---

# Likely questions

**"Can it post something embarrassing without us noticing?"**
No. Imported jobs are always pending and invisible to the public. A database
trigger enforces that on every import, so even a bug in the import code can't
publish. The test script proves it by trying to insert an already-approved job
directly in SQL — the database forces it back to pending.

**"What if the scoring misses a good job?"**
It stays in the queue, lower down. Nothing is deleted. About two thirds of the
current queue scores under 20% and every one is still reviewable.

**"Is this legal?"**
We use published RSS feeds, which exist to be read by software. We respect
`robots.txt` and identify ourselves. LinkedIn and Indeed are deliberately
excluded — their terms prohibit it.

**"How much maintenance?"**
Feed-based sources like jobRxiv are stable. Individual university pages break
when sites get redesigned — which is the argument for preferring aggregators.

**"What if a source breaks silently?"**
Every run is logged to a `scrape_runs` table with counts and errors, so a
broken feed looks different from a quiet one.

**"How do we add Stanford?"**
One row in the `job_sources` table, if they publish a feed. No deployment.

**"How long did this take?"**
One evening for the working pipeline. Most of the time went into checking which
sources are actually usable, and fixing some database issues I found along the
way.

---

# Troubleshooting

**Admin page is empty**
You're not signed in. http://localhost:8080/auth → admin@demo.local /
demo123456.

**"Docker daemon not running"**
Open Docker Desktop, wait for it to settle, then `npx supabase start`.

**Import returns 401**
`SRK` is empty or stale. Re-run the `SRK=$(...)` line.

**Import returns "connection refused"**
Terminal 2 (`functions serve`) isn't running.

**Public page shows "No jobs found"**
The two seed jobs are missing. Run the Full Reset below.

**Queue is empty**
Run the import command once to load jobs.

## Quick reset (between rehearsals, ~2 seconds)

Undoes approvals, keeps everything else:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "UPDATE jobs SET approval_status='pending', is_published=false WHERE is_auto_imported;"
```

## Full reset (~2 minutes)

Rebuilds the database from scratch, recreates the admin, re-imports, and
re-seeds the two public jobs:

```bash
npx supabase db reset

SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

curl -s -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"demo123456","email_confirm":true}' > /dev/null

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "UPDATE user_profiles SET is_admin=true, is_approved_poster=true WHERE email='admin@demo.local';"

curl -s -X POST "http://127.0.0.1:54321/functions/v1/ingest-jobs" \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{}' > /dev/null

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/seed-demo-jobs.sql

./scripts/verify-ingestion.sh
```
