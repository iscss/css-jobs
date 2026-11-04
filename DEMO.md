# Demo Script — Automated Job Ingestion

**Runtime:** ~8 minutes. **Setup:** ~5 minutes before anyone is watching.

The one thing to land: *jobs arrive automatically, bad ones are filtered out
automatically, but a human decides what goes live.*

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
# Terminal 2 — the import and link-check functions.
# For AI scoring, put your Anthropic key in supabase/functions/.env first
# (copy supabase/functions/.env.example). Without a key the import still works
# and uses keyword scoring.
npx supabase functions serve --no-verify-jwt --env-file supabase/functions/.env
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
   SELECT 'published: '||count(*) FROM jobs WHERE is_published;
   SELECT approval_status||': '||count(*) FROM jobs GROUP BY 1 ORDER BY 1;"
```

You want:
- **published: 2** — two hand-posted jobs so the public board looks real
- **pending:** a short list, roughly 80-100 after the cleanup (see Step 2 for
  the story). If it is over 1,000, the backlog has not been cleaned up yet: run
  the link check and the AI re-score first (INGESTION.md, "Clearing a backlog").
- **rejected:** the jobs the system set aside as clearly irrelevant. They are
  kept for 30 days (so the same job is not pulled in again tomorrow), then
  deleted automatically.

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

**Final check:** tab 1 shows your pending number (about 85), tab 3 shows exactly
2 jobs. The admin dashboard cards should read Published 2, Pending Review as
above, and Rejected as above. That gap is the demo.

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

**2a. The scale — tell the funnel.** Point at the dashboard cards, then the
count badge next to "Pending Job Approvals".

> "The importer pulled in [your total] postings. About half were already closed
> or dead links, and it removed those on its own. A large share of the rest were
> clearly not computational social science, and it set those aside. What's left
> for a person to review is this — [your pending number] jobs."

*(Rehearsal numbers: 1,679 imported → 888 dead or closed, deleted → 704
clearly irrelevant, rejected and kept → 85 left to review. Use your own counts
from the 1.3 query.)*

**2b. One card in detail.** Point at the top card and walk through its parts:

- **"Auto-imported" badge** (blue, with a robot icon)
  > "This tells you it came from a feed, not a person."
- **Match percentage** (green badge, top right, e.g. "90% match")
  > "How likely this is computational social science."
- **"View original" link**
  > "Goes straight to the real posting, so you can check it's genuine before
  > approving."
- **Deadline badge**, when the posting states one
  > "If a posting states a closing date, we store it, and the job comes off the
  > public site on its own that day."

**2c. Hover the match badge.** A tooltip shows the AI's one-sentence reason
(it starts with "AI:"), for example "PhD in economics applying NLP to public
opinion on energy policy."

> "It tells you why it scored the way it did, in plain language, so you can
> disagree with it."

**2d. The important point — what was set aside.** Scroll to the lower scores
(around 20-30%) and read one reason aloud, such as a health data role: "strong
ML methods but the research questions are clinical rather than social."

> "Here's what I want to be clear about. The system didn't delete anything for
> being irrelevant right away. Jobs it judged clearly unrelated are marked
> rejected and held for 30 days, so you can still bring one back, and then they
> are cleaned up automatically. Closed postings and dead links are deleted
> straight away. Everything in this queue is still a person's call."

*Why this matters: it's the answer to "what if the AI throws away a good job?"
Answering before it's asked is much stronger than answering after. In testing,
the AI disagreed with the old keyword filter on about 3 in 100 low-scoring jobs,
which is why the model scores them and the keywords are only a fallback.*

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

**4a.** Take the top card in the queue (the highest-scoring one).

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

Point at the newly added posting (the one you just approved).

> "One job went live because I approved it. The other [your pending number
> minus one] are still sitting in the queue, still invisible, waiting for
> someone to look at them."

*This before/after is what convinces people the approval gate is real. Everything
else is supporting detail.*

**Optional 4g — bulk actions.** If someone asks how a person copes with a long
queue: tick several cards (or "Select all shown" after filtering), and the bar at
the bottom offers Approve and Reject. It asks for confirmation, says how many
jobs it will change, and skips any that shouldn't be published (already
approved, closed, or past their deadline). Don't confirm during the demo unless
you want to change the numbers.

**Optional 4h — expiry.** If someone asks what happens when a job closes:

> "When a posting states a closing date, we store it. On that date the job
> disappears from the public site by itself, because the database stops
> returning it. A nightly job then deletes it. For jobs with no stated date, we
> check the link every few days, and a dead link takes the job down."

You can show the deadline badge on an admin card as the example.

## Step 5 — Run an import live (1.5 minutes)

**Switch to terminal 4.** Run the prepared command.

> "This is the import itself. In production it runs on a schedule, once a day
> overnight. I'm running it by hand so you can see what it does."

It takes 10-30 seconds. Point at the output:

```json
"fetched": 250,
"inserted": 0,
"duplicates": 250,
"stale": 0,
"llmScored": 0,
"llmFallback": 0
```

> "It fetched 250 jobs from the feed and inserted none of them — it recognised
> every one as already imported. That's the deduplication working. It also means
> it didn't spend anything scoring them: only new jobs go to the AI."

**If `inserted` is not 0** — that's fine, and arguably a better story:

> "It found some new postings this time. Those were checked, scored by the AI
> — `llmScored` is how many — and added to the queue. The ones it had already
> seen were skipped."

If `llmFallback` is above 0, say so plainly: those jobs got the simple keyword
score because the AI call failed, and the import carried on.

**Optional** — scroll up in the output to the `samples` array showing the
highest-scoring listings from this run.

**Optional — the link check.** Show that dead links are removed:

```bash
curl -s -X POST "http://127.0.0.1:54321/functions/v1/check-listings" \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{"dryRun": true, "limit": 20}' | python3 -m json.tool
```

> "This visits each job's link and checks it's still there and still open.
> A dry run just reports. In a real run, a dead or closed job in the queue is
> deleted, and a public job is hidden straight away."

## Step 6 — Where it's going (1.5 minutes)

Stop sharing, or switch back to the admin queue as a backdrop.

**What works now:**
- Automatic import from jobRxiv, CoMSES Net and several university career sites
  (Workday), deduplicated, with an AI relevance score and a plain-language reason
- Dead and closed postings are found and removed automatically
- Closing dates are stored, and jobs leave the public site on their own date
- Human approval enforced by the database, not just the interface
- New sources can be added with a single database row if an adapter fits

**What isn't built yet:**
- Nothing is deployed to production; this is all running on my laptop
- (Scheduling is built for the import, the link check and the cleanup, but
  none of it runs until it is deployed.)
- About 80 university jobs can't be link-checked because their sites block the
  checker; they stay in the queue, unverified
- Most postings state no closing date, so those rely on the link check

**On sources — be straight about this:**
> "I checked several. jobRxiv, CoMSES and the Workday university sites work well.
> Euraxess turned out to have no public
> way to read their listings — their system is for posting *to* them. HigherEdJobs
> blocks automated access. jobs.ac.uk changed their feeds and the documented URLs
> are dead. So each new source is its own small piece of work, and I'd prioritise
> the aggregators that cover many universities at once."

**On cost:**
> "The AI step costs a small fraction of a cent per new job, and jobs we've
> already seen cost nothing. Scoring a thousand-job backlog cost under ten
> cents. I've set a monthly spending cap on the key. Real usage is on the
> Anthropic console, and I'd check it after the first weeks."

**Close with the ask** — whatever you need: approval to deploy (the database
changes and the API key are the two things that need a decision), a decision on
sources, or time to continue.

---

# Likely questions

**"Can it post something embarrassing without us noticing?"**
No. Imported jobs are always pending and invisible to the public. A database
trigger enforces that on every import, so even a bug in the import code can't
publish. The test script proves it by trying to insert an already-approved job
directly in SQL — the database forces it back to pending.

**"What if the scoring misses a good job?"**
Possible, so the ordering is a guide and not a gate. In testing, a model read a
random sample of jobs the old keyword rules had scored low, and rated about 3
in 100 as strong matches. That is why the model scores them now. Jobs it rates
clearly irrelevant are set aside as rejected and kept for 30 days, so they can
be brought back, then deleted automatically. Everything above that line stays in the queue for a person.

**"What does it cost, and what if the AI is down?"**
A small fraction of a cent per new job, with a monthly cap on the key. If the
API fails for any reason, the job gets a simple keyword score and the import
carries on. The failure is counted in the run output.

**"Could someone game the AI with text in a job posting?"**
The posting text is treated as data, and the model's reply is just a number, a
sentence and a date, validated strictly. Even a manipulated score can only
change the order of the queue: the database forces every import to pending, so
nothing can reach the public site without a person approving it.

**"What happens when a job closes?"**
If it states a closing date, the public site stops showing it that day and a
nightly job deletes it. If not, the link check finds a dead or closed page
within a few days and takes it down (published jobs are hidden first, then
deleted 3 days later, so a mistaken flag can be undone).

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
[Say how long it took you.] A lot of the effort went into checking which sources
are actually usable, and into the cleanup logic: link checking and expiry.

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
Run the import command once to load jobs. If the queue was cleaned up and you
rejected everything under 20%, "Any match" in the filters may be hiding what's
left; check the Rejected count on the dashboard.

**The import output says `"llm": {"enabled": false}` or `llmFallback` is high**
The functions server doesn't have the key. Check that `supabase/functions/.env`
exists with `ANTHROPIC_API_KEY=...`, then restart terminal 2 with
`--env-file supabase/functions/.env`. If `llmScored` is 0 and `llmFallback` is
high with the key present, the key may be wrong or the account out of credit.

**Link check returns many `unknown`**
Some university sites return HTTP 403 to the checker. `unknown` is never acted
on, so nothing is lost; those jobs just stay unverified.

## Quick reset (between rehearsals, ~2 seconds)

Undoes the approvals you made during a rehearsal, keeps everything else:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "UPDATE jobs SET approval_status='pending', is_published=false
   WHERE is_auto_imported AND approval_status='approved';"
```

## Full reset (~2 minutes, plus the cleanup below)

Rebuilds the database from scratch, recreates the admin, re-imports, and
re-seeds the two public jobs. For the first import after a reset, raise the AI
cap so every new job is scored (add `MAX_LLM_PER_RUN=1500` to
`supabase/functions/.env` and restart terminal 2; this costs roughly ten
cents). The default cap is 150 per run, and jobs beyond it keep the keyword
score.

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

A fresh import has well over a thousand pending jobs, many already closed. To
get back to the short demo queue:

```bash
# 1. Remove dead and closed postings. Repeat until "remaining" is 0
#    (about 20 minutes for a full backlog; it is deliberately gentle on the
#    source sites).
curl -s -X POST "http://127.0.0.1:54321/functions/v1/check-listings" \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" \
  -d '{"limit": 60}' | python3 -m json.tool

# 2. Set aside the clearly irrelevant ones (kept as rejected, not deleted)
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c \
  "UPDATE jobs SET approval_status='rejected'
   WHERE approval_status='pending' AND is_auto_imported AND relevance_score < 0.2;"
```

Then re-run the 1.3 query to confirm the starting state. Jobs scored only by
keywords (because they came in past the AI cap) can be under-scored, so use the
raised cap above.

