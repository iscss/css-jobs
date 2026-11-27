# Automated job ingestion

How jobs get into the board without anyone typing them in: the nightly import, the AI
verdict, the link check, and the organiser. Part of the [CSS Jobs documentation](../README.md#documentation).

> **Nothing reaches the public site without an admin approving it.**

Related: where the sources are and which to add next is in [SOURCES.md](SOURCES.md); running
and deploying it is in [HANDBOOK.md](HANDBOOK.md#production-setup-one-time) and
[HANDBOOK.md > Operating production](HANDBOOK.md#operating-production).

- [The safety guarantee](#the-safety-guarantee)
- [How it works](#how-it-works)
- [Sources and adapters](#sources-and-adapters)
- [How-to guides](#how-to-guides): add a source, find and test a university's careers site, write an adapter, edit the AI prompts, change the keyword filter
- [Deduplication and freshness](#deduplication-and-freshness)
- [The AI verdict](#the-ai-verdict)
- [The link check](#the-link-check)
- [Organised job text](#organised-job-text)
- [Scheduling](#scheduling)
- [Running it by hand](#running-it-by-hand)
- [Tests and safety checks](#tests-and-safety-checks)

---

## The safety guarantee

Imported jobs are inserted as `pending` (or `rejected`, for clear non-matches) and always with
`is_published = false`. The row-level-security policy

```sql
CREATE POLICY "Anyone can view published jobs" ON public.jobs
  FOR SELECT USING (is_published = true AND approval_status = 'approved');
```

makes those rows unreadable to the public, at the database layer and not in the interface. A
database trigger (`trg_imported_jobs_pending`) forces `pending` or `rejected` and unpublished on
every auto-imported insert, so even a bug in the importer cannot publish a job. A
public-API check on production on 2026-11-04 returned only the published jobs.

---

## How it works

```
job_sources -> adapter -> normalise -> dedupe -> keyword pre-filter -> AI verdict
                                                                          |
                                  insert: pending, or rejected if verdict = reject
                                                                          |
                                      link check removes dead / closed jobs
                                                                          |
                                                              ADMIN REVIEW (human)
                                                                          |
                                                            approve -> live on /jobs
                                                                          |
                          organised into sections; hidden at its deadline; purged nightly
```

| File | Role |
|------|------|
| `supabase/functions/ingest-jobs/index.ts` | Entry point: loops sources, drops known jobs, gets verdicts, inserts, logs runs |
| `supabase/functions/check-listings/index.ts` | Link check and clean-up of stored jobs |
| `supabase/functions/rescore-jobs/index.ts` | Re-runs the AI verdict over pending and rejected imports (manual) |
| `supabase/functions/structure-jobs/index.ts` | Organises published jobs into sections |
| `supabase/functions/_shared/adapters.ts` | Per-source fetch and parse (jobRxiv, CoMSES, generic RSS, Workday, Oracle Recruiting) |
| `supabase/functions/_shared/ingest.ts` | Normalisation, HTML stripping, constraint checks, keyword scoring, hashing |
| `supabase/functions/_shared/llm.ts` | The AI verdict, closing-date extraction, and the prompt |
| `supabase/functions/_shared/structure.ts` | The organiser: prompt, quote checking, section slicing |
| `supabase/functions/_shared/liveness.ts` | Is a posting still there and still open, and what to do about it |
| `supabase/functions/_shared/auth.ts` | Who may call the functions (service key or `SCHEDULER_SECRET`) |
| `src/lib/*.test.ts` | Unit tests for all of the above |
| `scripts/verify-ingestion.sh` | Database-level safety checks against the local stack |

---

## Sources and adapters

Sources are rows in `job_sources` (data, not code). The list in use, what each returned on the
first production run, and the boards investigated are in [SOURCES.md](SOURCES.md). The adapters:

| Adapter | For | `config` |
|---------|-----|----------|
| `rss-jobrxiv` | jobRxiv's structured job feed | none |
| `rss-comses` | CoMSES Net (institution is recovered from the text; the feed escapes its HTML twice, which `stripHtml` handles) | none |
| `rss-generic` | Plain RSS 2.0 | `institution`, `location` |
| `workday` | University career sites on Workday (a search, then one request per posting) | `institution` (required); `search_terms`, `max_per_term` |
| `oracle-recruiting` | Career sites on Oracle Recruiting Cloud, such as Stanford (the same search-then-detail pattern, through Oracle's public REST service) | `institution` and `site_number` (required); `search_terms`, `max_per_term` |
| `csv-sheet` | A Google Sheet published to the web as CSV: one row per position, columns found by heading (institution, position, description, deadline, status, application link, notes). Rows the sheet marks as over are skipped | `location` (default "See posting"), `institution` |
| `smartrecruiters` | Careers sites hosted on SmartRecruiters (Notre Dame), through its public Posting API. `feed_url` is `https://api.smartrecruiters.com/v1/companies/<CompanyId>/postings` | `institution` (required); `search_terms`, `max_per_term` |
| `peopleadmin` | PeopleAdmin job sites (UNC Chapel Hill, Vermont, George Washington). Reads the site's Atom feed (`.../postings/search.atom?query=`), then each posting page for the description. Ignores the "No Positions Currently Open" placeholder a search with no results returns | `institution` (required); `search_terms`, `max_per_term` |
| `successfactors` | SAP SuccessFactors career sites (Duke, Purdue, TU Delft, Vienna, Toronto). Reads the site's `sitemap.xml`, keeps jobs whose title contains one of `search_terms` (default: postdoc, PhD, professor, lecturer, research scientist and similar), then opens up to `max_jobs` (default 40) of those pages for the description, location and deadline. A site in another language needs its own title words in `search_terms` |
| `uc-recruit` | University of California "AP Recruit" sites (Berkeley, Davis, San Diego, UCLA). `feed_url` is the campus's `/apply` address, which lists every open academic recruitment in one table. Rows about data, computing, the social sciences and research are opened first (up to `max_jobs`, default 40) and each page gives the description, dates and deadline |
| `html-jobs` | Any career site that lists jobs on an HTML page and gives each job its own page (ETH Zurich, IT University of Copenhagen, WZB, St. Gallen, Groningen, Bremen, Düsseldorf, Amsterdam, Copenhagen, MIT, Boston and Illinois through Academic Jobs Online). `feed_url` is the list page. Config: `institution`, `link_pattern` (a regular expression for the job links), optional `content_id` (the element holding the advert text), `title_filter` (words), `exclude_pattern`, `location`, `max_jobs`, `extra_list_urls` (more list pages), `title_from` (`"list"` for the link text, `"last-h1"` when the first heading on the page is the section name), `deadline_pattern` (a regular expression whose first group is a closing date written day.month.year, as German and Dutch sites do) and `delay_ms` (set it to a site's robots.txt Crawl-delay). If `feed_url` is a sitemap, the addresses are the list, and `slug_terms`, `priority_terms`, `max_pages` `newest_first` (open the highest-numbered addresses first, because sitemaps list the oldest jobs first) and `employers` (keep only jobs whose JobPosting employer contains one of the words) apply; that is how `jobsacuk` reads six UK universities from jobs.ac.uk. Uses a page's standard JobPosting markup when it has one. Only an HTTP 200 reply counts as a job page: a 202 is a bot challenge and is never imported. To add a site: open its list page, find what the job links have in common, set `link_pattern`, and run it with the importer's own test (`docs/INGESTION.md` how-to) |
| `prospective` | Swiss "Prospective" career centres (University of Zurich, Bern University of Applied Sciences). `feed_url` is `https://ohws.prospective.ch/public/v1/medium/<number>/jobs`, the JSON address the career page's script calls (the number is in the page's iframe address `.../careercenter/<number>/`). Reads every page of the list; the job's text comes from its fields (`sza_introduction`, `sza_tasks`, `sza_requirements`), the deadline from `end_date`. Config: `institution` (required), `lang`, `page_size`, `max_jobs`, `location` |
| `taleo` | Oracle Taleo career sections (Temple). `feed_url` is the section's `jobsearch.ftl` address. Calls Taleo's JSON search (needs the `portal` number from that page's source and a time-zone header) and reads each job's page, which carries `JobPosting` markup. Config: `institution`, `portal` (required), `max_jobs`, `location` |
| `tugraz` | The TU Graz job portal, through the JSON service behind it (`personal.tugraz.at/api/erec/public/job-postings`): a list, then each job by id. The public page `jobs.tugraz.at/en/jobs/<id>` is a script app that answers 200 for any id, so the link check also asks the JSON service. Config: `institution` (required), `location`, `max_jobs` |
| `pdf-jobs` | Sites that publish each job as a PDF linked from a plain page (Mannheim, Viadrina, the European University Institute). `feed_url` is the page; each PDF is downloaded (8 MB limit) and its text read with the `unpdf` library (`_shared/pdf.ts`, registered by `ingest-jobs` through `setPdfTextReader`, so the adapter file stays loadable in Node). The PDF's own address is the job's address, and it answers 404 once taken down. `config`: `institution` (required), `link_pattern` (default any `.pdf`), `exclude_pattern`, `title_pattern` (a regular expression whose first group is the title in the PDF text, for sites whose link text is only "Vacancy notice"; otherwise the link text, then the first line), `location`, `max_jobs` (30), `delay_ms` (500). The deadline is read from the text ("Application deadline", "Closing date", "Bewerbungsfrist", "per E-Mail bis zum ...", English and German month names; a bare "bis zum" is not used because it usually ends the contract) and put first as `Application deadline: YYYY-MM-DD.`. A PDF with under 200 characters of text (a scan) is skipped |
| `bocconi` | The Bocconi University job market (`jobmarket.unibocconi.eu`). One request: each position is a table row (id, Gazzetta Ufficiale number and date, deadline `dd/mm/yyyy`, role, department, field). The full call is a PDF under `/include/`, which `robots.txt` disallows, so only the row is read and the job's address is its own page `?id=<id>`. Most rows are past their deadline and are dropped as stale |

The sources the migrations create are in `20260803000000` (jobRxiv), `20260812000000` (CoMSES and the first Workday
universities) and `20260816000000` (the university sources from the lab list).

A source whose `adapter` names something that does not exist is logged as an error and skipped, which is why
sources that still need a reader are registered with `is_active = false`.

Which sources are active, which are registered but inactive, and why each is inactive: [SOURCES.md section 1](SOURCES.md#1-job-sources-the-importer-reads).
Each inactive row says why in its `config.status` and `config.note`.

Request headers identify the importer as `CSSJobsBot/1.0` with a contact address, and it spaces
its requests out. It does not try to get around a site that blocks it (see jobRxiv in
[SOURCES.md](SOURCES.md)). **The fix for a blocked site is to ask the owner to allow `CSSJobsBot`.**

---

## How-to guides

Each guide ends with how to put the change on production. Test locally first (see
[Running it by hand](#running-it-by-hand)); the commands for a production change are collected in
[Apply a change to production](#apply-a-change-to-production).

### Add a source that an existing adapter can read

No deploy is needed. A source is one row in `job_sources`:

| Column | Meaning |
|--------|---------|
| `slug` | Short unique name, used with `{"source": "<slug>"}` and in the logs. Convention: adapter prefix and place, e.g. `wd-upenn` |
| `name` | Shown in the logs |
| `adapter` | One of the adapters above |
| `feed_url` | Must start with `http://` or `https://` (the table enforces it) |
| `config` | The adapter's settings (table above), as JSON |
| `max_age_days` | Ignore postings older than this. Leave empty for feeds that list only open roles. Use 180 to 365 for career sites that keep old postings |
| `is_active` | `false` pauses a source without deleting it |

**A university on Workday.** Open the university's careers site. The address looks like
`https://<tenant>.wd<N>.myworkdayjobs.com/<site>` (or `.../en-US/<site>`). The importer's address is the same host with
`/wday/cxs/<tenant>/<site>/jobs`. Check it before adding it:

```bash
curl -s -X POST 'https://<tenant>.wd<N>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"appliedFacets":{},"limit":5,"offset":0,"searchText":"computational social science"}'
```

A JSON reply with a `total` is a working Workday site. If the careers page looks like something else, open one job and
look at its **Apply** link: Yale's front end is Phenom People, but the apply links go to Workday. A `.../hcmUI/CandidateExperience/...` address
means Oracle Recruiting (use `oracle-recruiting`, `site_number` is the part after `/sites/`). Then:

```sql
INSERT INTO job_sources (slug, name, adapter, feed_url, config, max_age_days) VALUES (
  'wd-example',
  'Example University',
  'workday',
  'https://example.wd1.myworkdayjobs.com/wday/cxs/example/careers/jobs',
  '{"institution": "Example University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
  365
);
```

**An RSS feed** uses `rss-generic`, with `{"institution": "...", "location": "..."}` and the feed's address. **An
Oracle site** uses `oracle-recruiting` with `feed_url` set to the site's root (`https://careersearch.stanford.edu`)
and `"site_number": "stanford"` in `config`.

**Test it before the first real run**, with a dry run that fetches and checks but inserts nothing, then a real run for
that one source, then a look at the result:

```bash
curl -s -X POST http://127.0.0.1:54321/functions/v1/ingest-jobs -H "Authorization: Bearer $SRK" \
  -H "Content-Type: application/json" -d '{"source":"wd-example","dryRun":true}'
```

Read `fetched`, `inserted`, `skipped` and the sample listings. If `fetched` is 0, check the address and
search terms. Search terms matter: a Workday site returns only what matches them, which is what keeps a
university's thousands of staff postings out.

**Make it permanent** by putting the row in a new migration file (`supabase/migrations/<later timestamp>_<name>.sql`,
using `INSERT ... ON CONFLICT (slug) DO NOTHING` so it can run twice), as
`20260816000000_seed_university_sources.sql` does, and apply that file to production
([below](#apply-a-change-to-production)). A row typed into the production SQL editor works too, but then a fresh database does
not have it and the next person will not know it exists.

**Pause or remove:** `UPDATE job_sources SET is_active = false WHERE slug = '...'`. The jobs already imported stay.

### Find, build and test a source for a university

The procedure used to cover most of the 92 institutions on Alex's list. Follow it for any new institution. The tools
are in `scripts/` and read public pages only, as `CSSJobsBot` (`discover-site.mjs` reads a handful of pages once each;
the source tests do what the nightly import does).

**1. Find the real careers page.** The homepage link is often the student career centre, not the staff and faculty jobs.
Search inside the institution's own domain (a web search limited to that domain, for example `jobs vacancies positions`
with only `uzh.ch` allowed) and look for a portal address such as `jobs.`, `careers.`, `stellen.` or a hiring-system
address. General searches return unrelated employers; domain-limited ones do not.

**2. Fingerprint it.** `node scripts/discover-site.mjs <address>`. It prints the hiring system it recognises, whether
pages carry schema.org `JobPosting` markup, what `robots.txt` asks of us (crawl delay, sitemaps, disallowed paths), how
many job-looking addresses the sitemap lists, and the repeated link shapes on the page. Then choose the reader:

| What you see | Reader | Notes |
|--------------|--------|-------|
| `myworkdayjobs.com` or `myworkdaysite.com` | `workday` | Find the tenant: `https://<tenant>.wd<N>.myworkdayjobs.com/robots.txt` answers 200 with `Sitemap:` lines naming the site; try wd1, wd3, wd5, wd12, wd103, wd105 |
| `oraclecloud.com` | `oracle-recruiting` | Needs the site number (`CX_...`) from the careers address |
| `smartrecruiters.com` | `smartrecruiters` | The company id is in the address |
| `/postings/search`, `peopleadmin.com` | `peopleadmin` | Try `<host>/postings/search.atom` |
| `/job/<title>/<id>/` addresses, `/talentcommunity/apply/`, a `sitemap.xml` of jobs | `successfactors` | The sitemap is the list |
| `JPF12345` addresses, "AP Recruit" | `uc-recruit` | The `/apply` page is the list |
| A sitemap of jobs, pages with `JobPosting` markup, or a list page that repeats one link shape | `html-jobs` | One reader, configured with a `link_pattern`; see its row in the adapters table |
| An aggregator carries the employer (jobs.ac.uk for the UK) | `html-jobs` with `employers` | One source can cover several institutions; leave the institutions' own rows off or every job is imported twice |
| `ohws.prospective.ch`, `direktlink.prospective.ch`, an iframe "careercenter" | `prospective` | The number is in the iframe address; the list is `.../public/v1/medium/<number>/jobs` |
| `taleo.net/careersection/<section>/` | `taleo` | Open the section's `jobsearch.ftl` and look for `portal=<digits>` in its source. The Taleo section name varies (Temple uses `tu_ex_faculty`, not `ex`) |
| `academicjobsonline.org/ajo/<code>` | `html-jobs` | List page of one institution; links `/ajo/jobs/<id>`; its `robots.txt` asks for 5 seconds between requests |
| A WordPress site with a `/vacature/` or `/job/` post type | `html-jobs` | `wp-sitemap.xml` or `<type>-sitemap.xml` lists the jobs (Groningen) |
| An Angular or React page that shows no jobs | a reader for its JSON | Download the page's `main.*.js`, search it for the API address (`apiUrl`, `baseUrl`, a `/jobs?` call) and open its lazy chunks (`runtime.*.js` names them) for the routes (TU Graz, Zurich) |
| A plain page with a link to a PDF per job (Mannheim, Viadrina, EUI) | `pdf-jobs` | Set `link_pattern` to the PDFs' folder and, if the link text is only "Vacancy notice", a `title_pattern` that finds the title in the PDF text |
| `jobmarket.unibocconi.eu` | `bocconi` | One list page; the row is the job |
| An iCIMS site (`*.icims.com/jobs/<id>/<title>/job`) | none | Its list and sitemap are readable, but the job page has no job text without scripts; see "When a site cannot be read" |
| CoreHR, PeopleSoft, Interfolio | none yet | See "When a site cannot be read" below |

**3. Be polite.** Use the identified bot (the readers do). Obey `robots.txt`: a `Crawl-delay` becomes `delay_ms` in
the config (Houston asks for 5 seconds, so it reads 15 jobs a night), and a disallowed path is never fetched. Keep one
source under about a minute (limit `max_jobs` or `max_pages`), because the whole source runs inside one function
call. **Never work around a bot challenge** (HTTP 202 or 403, "Just a moment"): ask the owner instead (template below).

**4. Configure and test.** Add the source by migration (see "Add a source that an existing adapter can read"). Then:

- `python3 scripts/list-sources.py sources.json`, then `npx tsx scripts/test-all-sources.mts sources.json --only <slug>`:
  runs the real reader, the importer's validation and a link check on three sample jobs. Look at the jobs themselves, not
  only the count: full descriptions, a sensible title, a location, a deadline.
  Add `--all-links` to link-check every job it fetched instead of three: a rule that calls removed jobs "dead" by their
  page content must never fire on a live one, and only checking them all proves it.
- **Test removed jobs.** `npx tsx scripts/test-link-check.mts <a real job address> <a made-up one on the same site>`. The
  real one must be `live`, the made-up one `dead` or `closed`. Many sites answer 200 for a removed job and only redirect
  (SuccessFactors to `/errorpage/`, UC to the list, PeopleAdmin to `/postings`, ETH to its front page) or show a notice
  (HR-Manager). The link check hides or deletes jobs it calls dead, so one that never says dead leaves closed jobs
  online, and one that says it too early removes live jobs.
- Add unit tests for any new code (`src/lib/adapters.test.ts`, `src/lib/liveness.test.ts`), with the site's responses
  mocked: the real jobs, a removed job, a page that fails, a bot-challenge page.

**5. Always test the older sources too.** `adapters.ts`, `ingest.ts` and `liveness.ts` serve every source, so a change
for one site can break another, and mocked unit tests do not show that a real site still answers. Before editing a shared
file: `npx tsx scripts/test-all-sources.mts sources.json --save before.json`. After: `... --compare before.json`. Every
source that worked must be unchanged (a count moving by one because a job was posted is normal); explain any other
difference. A source that fetched jobs before and fetches none now is a regression until shown otherwise.

**Check the edge functions under Deno before deploying.** The functions run on Deno, and `npx tsc --noEmit` does not
cover them (it missed a duplicate `const` in `adapters.ts` that Deno rejected at load). Deno needs no Docker and no
account: in an empty folder run `npm i deno`, then from the repository
`<that folder>/node_modules/.bin/deno check --node-modules-dir=none supabase/functions/ingest-jobs/index.ts` (repeat for
`check-listings`, `rescore-jobs`, `structure-jobs`). Deno refuses an `npm:` version published less than a day ago, so pin
a version that is at least a few days old (`unpdf@1.9.1`). To run a reader exactly as production does, write a small
`.ts` file that imports `ADAPTERS` and `setPdfTextReader` from `_shared/adapters.ts`, registers `readPdfText` from
`_shared/pdf.ts`, and run it with `deno run -A --node-modules-dir=none`. Delete the `deno.lock` it leaves in the repository.

**6. Document, then ship.** Update the tables and counts in [SOURCES.md](SOURCES.md), the adapters table above and the
migration list in [HANDBOOK.md](HANDBOOK.md); run `npx tsc --noEmit`, `npx vitest run` and `npm run build`. Deploy in this
order: the functions that changed (`ingest-jobs`, and `check-listings` if `liveness.ts` changed), then the SQL in the
SQL Editor, because a source switched on before its reader exists only logs "unknown adapter". The next morning run the
"did every source run" query in [Check that the sources are healthy](#check-that-the-sources-are-healthy).

**Edge cases found while doing this** (each has a test):

- The importer reads only the **first 4,000 characters** of a description for a deadline, so a reader puts its
  `Application deadline:` line **first**. Otherwise a long description's early "apply by <review date> for full
  consideration" wins over the real final date.
- Some systems put the **review date** where the closing date should be (UC's `validThrough`). Use the field the site
  itself calls the final date.
- A closing date with no time (or midnight) means the whole day: the job stays open until the day ends.
- An HTTP **202** is a bot challenge and must never be imported as a job; readers accept only 200.
- If a reader finds jobs but cannot open a single page, it **fails with an error** instead of reporting "0 jobs", so an
  outage shows in `scrape_runs`.
- A big employer lists a thousand jobs, mostly not academic: filter by the title in the address first, open the
  subject-word matches first, and cap the pages opened.
- A shared aggregator source and the institutions' own rows must not both be on.
- A **sitemap lists the oldest jobs first** (MIT). With a page cap you would only ever see the oldest: use `newest_first`.
- **German and Dutch dates** ("Bewerbungsfrist: 18.12.2026") are not understood by the importer. Use `deadline_pattern`, which rewrites the date as an `Application deadline:` line; a date that does not exist (31.02.2026) is ignored.
- A page's **first heading can be the section name** ("Offene Stellen"), not the job: use `title_from: "last-h1"`.
- A sitemap can list **non-job pages** (HHU lists events and the login page): the `link_pattern` is what keeps them out.
- A list page may accept **`limit` and `offset`** in its address (St. Gallen: `?limit=100` returns all 47 jobs in one request). Try it before writing paging code.
- A **sitemap URL can end in a fixed word** (iCIMS: `/jobs/<id>/<title>/job`): the title for `slug_terms` and `priority_terms` is taken from the part before it.
- A job page can carry **placeholder structured data**: NYU's iCIMS pages say `"description": "UNAVAILABLE"` and a deadline one year ahead, and the real text only appears when scripts run. A source like that cannot be read; do not import the placeholder.
- A list on a site's own **`/search/` pages can be disallowed while another path is not** (Michigan: `/search/` is disallowed, `/search-jobs?keyword=` is not): read `robots.txt` path by path, not only the first line.
- A **robots.txt that allows only named search engines** (`User-agent: *` / `Disallow: /`, then `Googlebot: Allow: /`) is a refusal for us, even if the site publishes an Atom feed (George Washington, Harvard): ask the owner.
- A **bot challenge that appears only after a few requests** (Columbia, UMass: the first page loads, later ones answer 202) is a rate-based challenge, so the source stays off; do not slow down or vary the client to get past it.
- A server can answer **406 to `Accept: text/html`** for a PDF (EUI); the link check asks for `application/pdf` first.
- A site whose `robots.txt` disallows everything (Syracuse) is **not read**, and a bot challenge on the job pages only (Oregon: the list opens, the job pages answer 202) leaves nothing to read.

**When a site cannot be read.** Say which of these it is in `config.note` and [SOURCES.md](SOURCES.md), so the next
person does not repeat the investigation:

| Cause | What to do |
|-------|-----------|
| Bot challenge or HTTP 403 (Princeton, Columbia, UMass, Oregon, Harvard, GESIS, Koç, QUT, UCD, DCU, JHU) | Ask the owner to allow `CSSJobsBot` (template below) |
| List built by script, no sitemap | Read the page's own source and scripts for the data address (this found the sources for Zurich, Bern, TU Graz, Temple, St. Gallen, Groningen, MIT and Amsterdam). If that fails, a person watches the browser's network tab and sends the address that returns the job data |
| Search needs a submitted form or a session (CoreHR: Oxford, UCD, DCU, King's; PeopleSoft: Northwestern, Georgia Tech) | A reader that submits the form (CoreHR answered an automated search with 403 at DCU); covered meanwhile by jobs.ac.uk where the institution posts there |
| No public feed (Interfolio) | None; use the institution's own page if it has one |
| PDF notices (EUI, Mannheim, Viadrina) | Adapter `pdf-jobs`: a configuration only. Bocconi is not a PDF case: its job market rows are read by `bocconi` |
| `robots.txt` disallows everything (Syracuse) | Do not read it; ask the owner for a feed |
| No central portal (Sapienza) | Nothing to read |

**Asking a university to allow the bot.** Send this to the institution's HR or web team (it has no private details):

> Subject: Allowing a job-listing reader for the ISCSS CSS Jobs board
>
> Hello, the International Society for Computational Social Science runs a free job board at https://jobs.iscss.org that
> lists open academic and research positions with a link back to the employer's own posting. Once a day our reader,
> identified as CSSJobsBot (contact admin@iscss.org), reads your public jobs list. Your site currently answers it with a
> bot challenge, so your openings cannot appear. Could you allow CSSJobsBot, or tell us if you publish a jobs feed (RSS,
> XML or an API) that we could use instead? We read only public postings, once a day, and obey robots.txt.
> Thank you.

### Switch on a registered but inactive source

The sources in section 1.2 of [SOURCES.md](SOURCES.md#12-registered-but-inactive) are in the table already. Read the
source's `config.note`:

```sql
SELECT slug, config->>'status' AS status, config->>'note' AS note FROM job_sources WHERE NOT is_active;
```

- **blocked**: ask the owner to allow `CSSJobsBot` (it reads the public careers page once a day and says who it is),
  then check with a dry run. Sites behind a bot challenge (Columbia and UMass Amherst's PageUp) also need a reader.
- **needs-adapter**: [write the adapter](#write-a-new-adapter) first.
- **unverified**: check the address from another network and identify the platform.

When it works: `UPDATE job_sources SET is_active = true, config = config - 'status' - 'note' WHERE slug = '...';`
and set `adapter` to the real one if it was a placeholder.

### Write a new adapter

An adapter is one function: it takes the source's `feed_url` and `config` and returns a list of `RawJob`
(`title`, `institution`, `location`, `description`, `sourceUrl`, and optionally `jobType`, `sourceJobId`,
`applicationUrl`, `postedAt`), defined in `_shared/ingest.ts`. It does **no validation**: `normalizeJob` checks lengths,
strips HTML and maps the job type. Use the Workday and Oracle adapters in `supabase/functions/_shared/adapters.ts` as
the pattern for a site with a search and a detail page. Steps:

1. Find the data, not the page. Look in the browser's Network tab for a JSON or XML service the page calls (that is how
   the Workday, Oracle and Atom readers were found). Check the site's terms and its `robots.txt` first. Where a site refuses
   automated requests, stop and ask the owner; do not work around it.
2. Write the function in `_shared/adapters.ts`. Send the `CSSJobsBot` headers, sleep a few hundred
   milliseconds between requests, **throw a clear error when the response is not OK** (so a failing source shows in
   `scrape_runs` and does not look like a quiet day), and **skip a posting you cannot read instead of throwing**.
3. Register it in the `ADAPTERS` object at the bottom of that file.
4. Add tests in `src/lib/adapters.test.ts`, with the HTTP calls mocked: the mapping, paging, duplicates, a failed detail,
   an empty description, a missing config value and a non-OK reply. `oracleRecruitingAdapter` has eight to copy.
5. **Teach the link check about the site** if its pages are JavaScript apps that answer 200 for anything (check
   with a made-up job id: if it says "live", it is wrong). Add a branch in `checkListing` in `_shared/liveness.ts` that asks
   the site's own data service whether the posting still exists, as the Workday and Oracle branches do, with tests in
   `src/lib/liveness.test.ts`. A job whose link cannot be checked stays `unknown`, which is never acted on.
6. Add the source row ([above](#add-a-source-that-an-existing-adapter-can-read)), run `npx vitest run`, a dry run, then a real
   run, and look at what came in.
7. Deploy `ingest-jobs` and `check-listings` ([below](#apply-a-change-to-production)).

### Edit the AI prompts

There are two prompts, and both treat the posting as data, never as instructions. Keep that sentence when you edit.

| What | Where | Used by |
|------|-------|---------|
| **Does the job fit CSS?** The definition, the three verdicts, the closing-date rules | `SYSTEM_PROMPT` in `supabase/functions/_shared/llm.ts` | `ingest-jobs` (new jobs) and `rescore-jobs` |
| **Organising a posting into sections.** What the model may and may not do | `STRUCTURE_SYSTEM_PROMPT` in `_shared/structure.ts` | `structure-jobs` |
| The model name | `DEFAULT_MODEL` in `llm.ts`, `STRUCTURE_MODEL` in `structure.ts`, or the `ANTHROPIC_MODEL` secret on Supabase to override both without a code change | |
| How many jobs get a verdict per run | `MAX_LLM_PER_RUN` secret (default 150) | `ingest-jobs` |

**Changing what counts as CSS (the usual edit).** Change the definition paragraph and the verdict list in `SYSTEM_PROMPT`.
The reply format (one JSON object with `verdict`, `reasoning`, `deadline`) is parsed by `parseScore`, so change the format only together with that
function and its tests. Keep the rule "when unsure, choose borderline, never reject": it is what stops a good job from being
filed as rejected. The same definition is written in prose at the top of
[The AI verdict](#the-ai-verdict), so update that paragraph too. Then:

1. `npx vitest run` (the prompt tests check that the posting is wrapped in `<posting>` tags and that the format parses).
2. **Try it on real jobs before it goes live.** Locally, run `rescore-jobs` with `"dryRun": true` and read the verdicts
   it would give. A good test set is a dozen jobs you already know: some clear fits, some clear misses, some
   borderline ones.
3. Deploy `ingest-jobs` and `rescore-jobs`, so both use the new prompt.
4. **Re-run the verdict over the queue** so existing jobs follow the new rules: run the link check to completion first
   (hard checks, then the AI), then `rescore-jobs` in pages until `next` is null
   ([Running it by hand](#running-it-by-hand)). It leaves published jobs and anything an admin acted on alone.

**Changing the organiser's prompt.** The organiser may only point at text (quotes and starting positions). If you let the prompt ask for
rewriting, `verifyStructure` will throw those answers away, because every quote is checked against the original. To
see a change on jobs that already have an organised copy, clear it (`UPDATE jobs SET structured = NULL, structured_at = NULL WHERE id = '...'`) and run
`structure-jobs`. Deploy `structure-jobs` after the change.

### Change the keyword filter

The free first step before the AI is `scoreRelevance` in `_shared/ingest.ts`. Its word lists are, in order, `EXPLICIT_FIELD`
(field names that are CSS by definition), `METHOD_SIGNALS`, `SOCIAL_SIGNALS` (a role needs both) and `DISQUALIFYING`
(fields that are never CSS: a match skips the AI and files the job as rejected). Each entry is a regular expression
and a weight. **Be careful adding to `DISQUALIFYING`**, because a match there is the one case where a job is rejected
without the AI looking at it; test the pattern against real titles. The tests are in `src/lib/ingest.test.ts`. The functions
that use it need redeploying, and `rescore-jobs` re-files what is already queued.

### Check that the sources are healthy

Do this after adding a source, after a deploy, and now and then (monthly is plenty).

**1. Did last night's import work?** One row per source per run:

```sql
select source_slug, status, fetched_count, inserted_count, left(error_message, 90) as error, started_at
from scrape_runs order by started_at desc limit 20;
```

(on production, run it in the SQL editor or with `npx supabase db query --remote=ukkqeczgommifgecyrez --read-only "..."`).
A healthy source says `success`. A source that finds nothing is not an error: most days a university has no new CSS posting.
`fetched_count` of 0 for many days in a row on a source that used to find jobs is worth a look.

**Did every active source run?** Each active source should have a run from the last day. This lists any that did not:

```sql
SELECT s.slug, max(r.started_at) AS last_run
FROM job_sources s LEFT JOIN scrape_runs r ON r.source_slug = s.slug
WHERE s.is_active
GROUP BY s.slug
HAVING max(r.started_at) IS NULL OR max(r.started_at) < now() - interval '30 hours'
ORDER BY last_run NULLS FIRST;
```

No rows is healthy. (Before migration `20260819000000`, several sources were skipped most nights because they were all fetched in one call that hit its time limit.)

| Error in the log | Meaning | What to do |
|------------------|---------|------------|
| `HTTP 403` | The site refuses automated requests (jobRxiv does this to Supabase's servers) | Ask the owner to allow `CSSJobsBot`. Do not try to get around it |
| `HTTP 429` | Rate limited | Normally clears by itself the next day. If it persists, add search terms or lower `max_per_term` so fewer requests are made |
| `did not return JSON (got text/html ...)` | The site answered with a web page: a **maintenance window** or a **bot check**. Workday goes down for maintenance on some weekends, and every Workday source fails together | If all Workday sources fail on the same night, wait: the next night's run is normal. If one source fails for days, run its dry run and open its address |
| `Workday search returned HTTP 422` | The search address or its settings are wrong for that tenant (Carnegie Mellon does this) | Re-check the `feed_url` as in [the Workday steps](#add-a-source-that-an-existing-adapter-can-read) |
| `unknown adapter` | The row's `adapter` does not exist in `ADAPTERS` | Fix the name, or set `is_active = false` until the adapter exists |
| `feed returned HTTP 404` or a DNS error | The address moved or the site is gone | Find the new address and `UPDATE job_sources SET feed_url = '...'` |

**2. Is the nightly job itself running?** `select jobname, schedule, active from cron.job;` shows the four schedules, and
[HANDBOOK > Operating production](HANDBOOK.md#operating-production) says how to read the HTTP replies if `scrape_runs` stays empty.

**3. Do the addresses in the documentation still work?**

```bash
./scripts/check-source-links.sh
```

It lists every address in [SOURCES.md](SOURCES.md) that does not answer 200. A 403 is usually a site that refuses
automated requests, and a 404 or "000" is a real problem: fix the address in `docs/SOURCES.md` (edit the file directly) and, for a job source, the `feed_url` in the
`job_sources` table.

**4. Try one source by hand** with a dry run, which fetches and checks but inserts nothing
([Running it by hand](#running-it-by-hand)).

### Change the schedule

How often the import, link check and organiser run is set in the database, not in code:
[HANDBOOK > Operating production](HANDBOOK.md#operating-production) has the `cron.alter_job` commands.
The window for which postings count as too old is the source's `max_age_days`.

### Apply a change to production

| You changed | Do |
|-------------|----|
| A row in `job_sources` or any SQL | A new file in `supabase/migrations/`, applied with `psql` ([HANDBOOK > Deployment](HANDBOOK.md#deployment)). `db push` does not work on production |
| `_shared/adapters.ts`, `_shared/ingest.ts` or `_shared/llm.ts` | `npx supabase functions deploy ingest-jobs rescore-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |
| `_shared/liveness.ts` | `npx supabase functions deploy check-listings --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |
| `_shared/structure.ts` | `npx supabase functions deploy structure-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |
| Several of these | Deploy them all together: `npx supabase functions deploy ingest-jobs rescore-jobs check-listings structure-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez --yes` |

Functions import the `_shared` files at deploy time, so a change to a shared file does nothing on production until the
functions that use it are redeployed. **A new source is picked up by the next 03:00 UTC run**, or import it at once by
calling `ingest-jobs` with `{"source": "<slug>"}` (key and address: [Running it by hand](#running-it-by-hand), with the
production address from [HANDBOOK](HANDBOOK.md#production-setup-one-time)). Imported jobs always land as pending, so
an admin sees them in the queue before anyone else does.

---

## Deduplication and freshness

**Deduplication**, enforced by unique indexes:

- `source_url`: the same posting is never imported twice.
- `content_hash`: SHA-256 of normalised `title + institution`, so the same role syndicated under
  different URLs collapses to one.

A duplicate insert returns Postgres error `23505`, which the function counts and does not treat as a failure.

**Freshness.** Feeds keep entries for very different lengths of time: jobRxiv expires its own within days,
CoMSES still lists postings from 2021. Three signals retire a listing at import:

- **A stated deadline that has passed**, read from the description by `extractDeadline()`.
- **A posting date older than the source's window**, set per source in `job_sources.max_age_days`
  (`NULL` turns it off). Current windows: CoMSES 180 days, Workday universities 365, jobRxiv none.
- **A closing date found by the AI.** Most postings state it near the end, so the prompt includes short
  excerpts around any "deadline" or "apply by" wording. A year-less date is resolved from the posting date, a
  date when review of applications *begins* is ignored, and an implausible date becomes null.

A listing with **no date at all is kept**: no date is not evidence of staleness, and an admin can still
judge it. About 85% of postings state no deadline, so most stay until the link check finds them closed.

```sql
-- Tune a source's window without a deploy
UPDATE job_sources SET max_age_days = 365 WHERE slug = 'comses';
```

After import: the public read rule hides a job after its `application_deadline` with no polling (a job
stays visible through the deadline day, UTC), and `purge_expired_jobs()` deletes jobs past their deadline,
hidden dead or closed jobs after 3 days, and auto-imported jobs rejected for more than 30 days (clock:
`rejected_at`). Jobs a person posted and an admin rejected are kept by the purge. Tags, saved jobs, alert
matches and queued emails cascade with the job.

---

## The AI verdict

**The definition** both the AI and the keyword lists follow: *computational social science is using
computation to measure and model human behavioural data, with computational methods (data science, network
analysis, natural language processing, large-scale digital trace data analysis, machine learning, online or
digital experiments) used to study social, political, economic or behavioural questions. A role needs both a
computational method and a social or behavioural subject. Pure natural science, clinical, biomedical,
administrative, sales or marketing roles are excluded.* It is written out in the prompt in
`_shared/llm.ts`; the keyword lists in `_shared/ingest.ts` mirror it.

Relevance runs in two steps, and **it only files and orders the queue**:

1. **Keyword pre-filter (free).** `scoreRelevance()` scores obviously unrelated roles (clinical, lab,
   marketing, administrative) as excluded, and those skip the AI. On a random sample the AI agreed with this
   filter on 98 of 99 jobs.
2. **AI verdict.** For everything else, `scoreWithLlm()` asks a Claude Haiku model to apply the definition and
   return a **verdict**, a one-sentence **reason** (shown as "AI: ..." in the admin tooltip) and the
   **closing date** if the posting states one. There is **no numeric score**. Only new jobs are checked.

**Verdicts**, stored in `jobs.relevance_verdict`:

| Verdict | Meaning | What happens |
|---------|---------|--------------|
| `accept` | A clear CSS fit | Pending, sorted first |
| `borderline` | Adjacent, or too vague to tell (the prompt says to choose this when unsure) | Pending, sorted second |
| `reject` | Clearly not CSS | Inserted as `rejected`, kept 30 days, can be restored |
| (none) | The keyword filter excluded it, or the AI call failed | Excluded: rejected. Failed: pending |

If the AI is unavailable (no key, API error, refusal, or a reply without a valid verdict) the job falls back to
the keyword check, which never rejects on its own; only a keyword-excluded role is rejected. `relevance_score`
now holds just the keyword score and is not used for ordering. Settings: `ANTHROPIC_API_KEY`, optional
`ANTHROPIC_MODEL`, and `MAX_LLM_PER_RUN` (default 150; jobs beyond it keep the keyword result). Cost is a small
fraction of a cent per new job; check real spend in the Anthropic Console.

**Re-running the verdict.** After changing the prompt or rules, call `rescore-jobs`. It re-scores every
auto-imported job still pending or rejected and files each by its new verdict (a wrongly rejected job can
come back). It skips published jobs and any job an admin acted on, and leaves a job unchanged if the AI call
fails. It works in pages of up to 200 and returns `next`; repeat with `"after": next` until it is null (add
`"dryRun": true` to preview). **Run the link check to completion first**, so dead jobs are deleted instead of
scored: hard checks, then the AI.

---

## The link check

`check-listings` re-checks stored jobs' links (`source_url`, or `application_url` for hand-posted jobs):

| Result | Meaning |
|--------|---------|
| `live` | Page loads and looks open |
| `dead` | HTTP 404 or 410, or a redirect to the site's home page, to a SuccessFactors `/errorpage/`, or from a UC `/JPF12345` page to the campus list |
| `closed` | A past `validThrough` date, a visible "listing has expired" notice, a passed `application_deadline`, or a Workday posting with applications closed |
| `unknown` | Blocked (403 or 429), a server error, a timeout, or a page with no readable text: **never acted on** |

**What it does with a dead or closed job:**

| The job | Action |
|---------|--------|
| Imported, pending or rejected | Deleted (a closed posting has no value to keep, and feeds list only open roles) |
| Posted by a person, pending or rejected | **Kept**; the result is recorded on the job so an admin can see it (a typo in a link must not make a submission vanish) |
| Published | Hidden at once (`job_status = 'filled'`); the purge deletes it 3 days later, leaving time to reactivate a wrong flag |

The rule is `linkCheckAction` in `_shared/liveness.ts`. A few details learned the hard way:

- **Workday** pages are JavaScript apps that answer 200 for anything, so Workday jobs are checked through the
  same JSON endpoint the importer uses. This covers `<tenant>.wdN.myworkdayjobs.com` links and
  `wdN.myworkdaysite.com/recruiting/...` links (University of Washington). A Workday **403** means a posting was
  taken down but can also mean we are blocked, so it counts as `dead` only when the tenant's own job search no
  longer lists the requisition.
- **Oracle Recruiting** pages (Stanford) are also JavaScript apps, so they are checked through Oracle's REST service: no
  matching requisition means `dead`, and a past end date means `closed`. A made-up job id was reported live by the plain
  page check, which is why this exists.
- **PeopleAdmin** (UNC, Vermont, Indiana, Rutgers), **ETH Zurich** and **HR-Manager** also answer 200 for a removed job:
  PeopleAdmin redirects `/postings/<id>` to `/postings`, ETH redirects to its front page, and HR-Manager shows "A project with ID n does not exist". All count as `dead` or `closed`.
- A **PDF notice** (Mannheim, Viadrina, EUI) is judged by its status alone: the link check asks for `application/pdf` (EUI answers
  406 to `Accept: text/html`), calls an answering PDF `live` without reading it, and a 404 `dead`. The **Bocconi** job page
  (`?id=<id>`) answers 200 for any id; a removed position shows the page frame without its own table row, which counts as `dead`.
- **Taleo** (Temple), **Academic Jobs Online** (Boston, Illinois) and the **University of Copenhagen** also answer 200 for a
  removed job, with a different page: Taleo the page frame with no `JobPosting` block (a live job always has one), AJO the
  whole job list with no `JobPosting`, Copenhagen the "All vacancies" list. All count as `dead`. **TU Graz** pages are a
  script app that answers 200 for any id, so the check asks the JSON service (`/api/erec/public/job-postings/<id>`),
  which answers 404 for a removed job and carries the closing date. Found the same way: a live job and a made-up
  one through `scripts/test-link-check.mts`, then every fetched job through `test-all-sources.mts --all-links`.
- **SuccessFactors** and **UC recruitment** sites answer 200 for a removed job but redirect: SuccessFactors to
  `/errorpage/`, UC to the campus `/apply` list. Both count as `dead`. UC pages also put the *review* date in
  `validThrough` while accepting applications until the "Final date", so the check uses the Final date for them.
  Both were found by testing a made-up job id and a live UC job against the link check.
- When a reader finds jobs but cannot read a single page (a block or an outage), it fails with an error in
  `scrape_runs` rather than reporting "0 jobs". The importer reads only the first 4,000 characters of a
  description for a deadline, so readers put their `Application deadline:` line first.
- A **429** (rate-limited) is retried once after a few seconds; a job left `unknown` is tried again after a day
  (not the full week).
- The word "expired" in a stylesheet is not a closed posting: the check reads only visible text, status codes,
  redirects and structured metadata.

Published jobs are rechecked every 3 days and pending and rejected jobs weekly (`publishedRecheckDays` and
`recheckDays` in the request body). Each call takes the least recently checked jobs first and is gentle on
the sites (two requests at a time with a short pause), so a large backlog takes a while: about 20 minutes for
a thousand jobs. It never publishes anything; hiding a published job is the only public-facing change.

---

## Organised job text

Published jobs are organised into labelled sections (Overview, Responsibilities, Qualifications,
Compensation and benefits, How to apply, About the employer, Other) plus pay range, application link, deadline and
location. The original description is never changed; the job popup shows the organised copy when there is one,
with a **Show original posting** toggle.

- **Which jobs:** any job that is approved, published and active and has no organised copy yet. This is by
  state and not by AI verdict, so a job an admin approves after the AI rejected it is covered, as are
  hand-posted jobs and bulk approvals. Pending and rejected jobs are not organised.
- **How:** `structure-jobs` runs every 15 minutes for up to 20 jobs; a run with nothing to do costs nothing.
  Admins can use **Organise now** in Job Management for one job.
- **The model only points at text.** It returns exact quotes and where each section starts.
  `_shared/structure.ts` checks every quote against the posting and slices the original text, so a pay figure,
  link or date that the posting does not contain is dropped and no wording changes. Matching ignores case,
  spacing and punctuation but keeps a currency sign. Thinking is off for this call: it only copies, and hidden
  thinking used up the output budget on long postings.
- **The application link** found this way is shown only when a job has no application URL, and only if it is an
  `http(s)` address.
- **Cost:** about $0.0004 per job on Claude Haiku 5.5 (about 2,500 tokens in, 300 out), measured on a 50-job
  trial where all 50 succeeded and no text was lost.
- **Failures:** a job the model could not read gets `structure_failed_at` and is tried again after 6 hours.
  Editing a job's description clears its organised copy (a database trigger), so it is redone.
- **Storage:** `jobs.structured` (jsonb), `structured_at`, `structure_failed_at` (migration `20260813000000`).

---

## Scheduling

Four schedules run in the database (`pg_cron`), each calling a SQL function that posts to an edge function:

| Job | When (UTC) | Calls | What it does |
|-----|------------|-------|--------------|
| `ingest-jobs-daily` | 03:00 daily | `run_job_ingestion()` | Fetch, get a verdict, insert as pending or rejected. **One request per active source**, so each has its own time limit (migration `20260819000000`) |
| `purge-expired-jobs` | 00:05 daily | `purge_expired_jobs()` | Delete expired, hidden dead and old rejected jobs |
| `check-listings` | every 2 hours, at :15 | `run_listing_check()` | Link check, up to 60 due jobs per call |
| `structure-jobs` | every 15 minutes | `run_job_structuring()` | Organise up to 20 published jobs |

**Why one request per source.** The importer used to be called once and looped over every source inside that call, which has a time limit; with 15 sources the call was cut off and the last ones were skipped most nights (`scrape_runs` showed 7 to 10 sources a night). Check that every active source ran with the query in [Check that the sources are healthy](#check-that-the-sources-are-healthy).

**Scheduling covers fetching and checking only.** Imported jobs still land as `pending` or `rejected` and an
admin approves every one.

### Configuration

The function address and the credential live in `ingestion_settings` (admin-only, RLS enabled), not in the cron
command, which anyone who can query `cron.job` can read:

```sql
INSERT INTO ingestion_settings (key, value) VALUES
  ('function_url', 'https://<project>.supabase.co/functions/v1/ingest-jobs'),
  ('service_role_key', '<the SCHEDULER_SECRET value>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

The functions accept either the project's service role key or a `SCHEDULER_SECRET`, compared in constant time and
never under 32 characters (`_shared/auth.ts`). The value stored in `service_role_key` is sent as the bearer
token. On production the service key shown in the dashboard did not match the one the deployed functions hold
(found by comparing digests from `supabase secrets list`), so it returned 401; a dedicated secret avoids that and
can be rotated on its own. The other functions' addresses are derived from `function_url` (optional keys
`check_listings_url` and `structure_jobs_url` override them). Step by step: [HANDBOOK > Production setup](HANDBOOK.md#production-setup-one-time).

The cron log only shows that the SQL ran, not that the function succeeded. Check `scrape_runs` and
`net._http_response` (see [HANDBOOK > Operating production](HANDBOOK.md#operating-production)).

---

## Running it by hand

Locally (Docker Desktop running, `npx supabase start`, functions served; see
[HANDBOOK > Local development](HANDBOOK.md#local-development)):

```bash
SRK=$(npx supabase status -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['SERVICE_ROLE_KEY'])")

# Import. Body options: "dryRun": true (fetch and check, insert nothing), "llm": false (skip the AI),
# "source": "<slug>" (one source). Run sources one at a time: a call over every source can hit the time limit.
curl -s -X POST http://127.0.0.1:54321/functions/v1/ingest-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"source":"wd-uw","dryRun":true}'

# Link check (repeat until "remaining" is 0)
curl -s -X POST http://127.0.0.1:54321/functions/v1/check-listings \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 60}'

# AI verdict over what is queued (repeat with "after": <next> until next is null)
curl -s -X POST http://127.0.0.1:54321/functions/v1/rescore-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 100}'

# Organise published jobs ("jobId": "<uuid>" for one job)
curl -s -X POST http://127.0.0.1:54321/functions/v1/structure-jobs \
  -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" -d '{"limit": 20}'
```

The import response reports, per source, `fetched`, `inserted`, `duplicates`, `skipped`, `stale`, `llmScored`,
`llmFallback` and `autoRejected`, plus a few sample listings with their verdicts.

**The order for a first import, or after a long gap, is hard checks first:** import with `"llm": false`, run the
link check until `remaining` is 0, then run `rescore-jobs`. The AI then never scores a job that turns out to be
dead.

---

## Tests and safety checks

Two layers, because they answer different questions.

**Unit tests, `npx vitest run`.** Cover the pure functions with feeds and the AI client mocked: fast, with no
database or network. They include entity decoding, HTML stripping (also for doubly escaped HTML), job-type mapping,
keyword scoring, content hashing, constraint validation, feed parsing, AI reply parsing, deadline validation, link
classification and the delete/keep/hide rule, the organiser's quote checking, the credential check, role names, and a
rendering test of the profile page for every kind of account. Notable cases:

- **Bot-protection pages are treated as failures.** HigherEdJobs answers 200 with a protection page; parsing it as
  RSS would report "0 jobs" and look like a quiet day.
- **`mapJobType` never returns `'RA'`.** That value exists in an old migration but not in production, so it would fail every insert.
- **Malformed listings are skipped, not thrown.** One bad item must not abort a 100-item run.
- **Any AI failure falls back to the keyword result.** An API error, refusal or unreadable reply never aborts a run.
- **A doubtful AI deadline is discarded.** Impossible dates, dates years away and review-start dates become null.
- **A quote the model invents is dropped**, so a made-up pay figure, link or date cannot reach applicants.

**Safety checks, `./scripts/verify-ingestion.sh`.** Database-level checks against the running local stack that
verify what a buggy import or a hostile caller can actually do: an anonymous API request returns no imported jobs;
an insert claiming `approved`, `published` or `featured` is clamped to pending even from SQL; a duplicate
`source_url` or `content_hash` is rejected; the database constraints hold (short description or title, non-http URL);
and the ingest endpoint rejects the anonymous key. It cleans up its own test rows. It needs Docker and
`npx supabase start`, and was not re-run for the November 2026 documentation update.

**Live source tests, `scripts/`.** These check the real sites, so they need the network and are not part of
`npx vitest run`: `list-sources.py` (what the migrations define), `test-all-sources.mts` (every active source through
its reader, the importer's validation and the link check, with `--save` and `--compare` to catch regressions),
`test-link-check.mts` (what the link check says about given addresses) and `discover-site.mjs` (what a careers site
runs on). How to use them is in [Find, build and test a source](#find-build-and-test-a-source-for-a-university).
They do not call the AI review or write to any database.

`scripts/seed-demo-jobs.sql` adds two published jobs for local demos, so the public board is not empty next to a
queue of hidden imports. **Local use only; never run it against production.**
