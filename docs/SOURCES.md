# Sources

Where jobs come from, and the wider computational social science (CSS) community that
could supply more. Part of the [CSS Jobs documentation](../README.md#documentation).

- **Job sources the importer reads today:** [section 1](#1-job-sources-the-importer-reads)
- **Boards and aggregators we looked at:** [section 2](#2-boards-and-aggregators-investigated)
- **The CSS community directory**, taken from the [Penn CSS Lab community page](https://css.engineering.upenn.edu/about/community/), [varyCSS](http://varycss.org/) and [SICSS](https://sicss.io/): [section 3](#3-css-community-directory)
- **What to add next, and how:** [section 4](#4-adding-more-sources)
- **The institutions Alex suggested, and where each stands:** [section 5](#5-institutions-suggested-on-2026-11-26)
- **The curated hiring sheet:** [section 6](#6-the-hiring-sheet)

How the importer works is in [INGESTION.md](INGESTION.md); how to add a source is in
[INGESTION.md > How-to guides](INGESTION.md#how-to-guides).

> **Checked on 2026-11-06 and 2026-11-07.** Pages move: several links on the Penn community page
> had already changed or block automated requests (noted below). Treat the status
> columns as a snapshot and re-check a site before building an importer for it.
> The community lists were read from the public pages with a handful of polite
> requests and nothing was scraped in bulk. To re-check every address here, run
> `./scripts/check-source-links.sh`; for the health of the job sources themselves, see
> [INGESTION.md > Check that the sources are healthy](INGESTION.md#check-that-the-sources-are-healthy).

---

## 1. Job sources the importer reads

These are rows in the `job_sources` table (see [INGESTION.md](INGESTION.md#how-to-guides)). The first production
import ran on 2026-11-04 with the first ten rows below. The university sources from the lab list were added on
2026-11-07 (migration `20260816000000`), tested against the live sites. The migration was applied to production
and the importer functions redeployed the same day ([HANDBOOK > Deployment](HANDBOOK.md#deployment)), so their
first production run is the 03:00 UTC import on 2026-11-08. Their "Result" below is from a test import on a
local copy, not from production.

### 1.1 Active

| Slug | Source | Adapter | Address | Max age | Result |
|------|--------|---------|---------|---------|--------|
| `jobrxiv` | [jobRxiv](https://jobrxiv.org/) | `rss-jobrxiv` | `jobrxiv.org/?feed=job_feed` | none | **Blocked: HTTP 403** from Supabase's servers (works from other networks). About 760 jobs found locally; 33 relevant |
| `comses` | [CoMSES Net](https://www.comses.net/) | `rss-comses` | `comses.net/feeds/jobs/rss/` | 180 days | Production: 6 imported (114 of 120 too old) |
| `wd-brown` | Brown University | `workday` | `brown.wd5.myworkdayjobs.com` | 365 days | Production: 1 |
| `wd-cornell` | Cornell University | `workday` | `cornell.wd1.myworkdayjobs.com` | 365 days | Production: 17 |
| `wd-osu` | Ohio State University | `workday` | `osu.wd1.myworkdayjobs.com` | 365 days | Production: 23 |
| `wd-uchicago` | University of Chicago | `workday` | `uchicago.wd5.myworkdayjobs.com` | 365 days | Production: 41 |
| `wd-umd` | University of Maryland | `workday` | `umd.wd1.myworkdayjobs.com` | 365 days | Production: 14 |
| `wd-uva` | University of Virginia | `workday` | `uva.wd1.myworkdayjobs.com` | 365 days | Production: 0 (no matches) |
| `wd-uw` | University of Washington | `workday` | `uw.wd5.myworkdayjobs.com` (job links use `wd5.myworkdaysite.com`) | 365 days | Production: 15 |
| `wd-wisconsin` | University of Wisconsin | `workday` | `wisconsin.wd1.myworkdayjobs.com` | 365 days | Production: 36 |
| `wd-upenn` | University of Pennsylvania (Warren Center, Wharton, CSSLab) | `workday` | `upenn.wd1.myworkdayjobs.com`, site `careers-at-penn` | 365 days | Local test: 27 found, 25 inserted (all keyword-rejected: mostly staff roles) |
| `wd-northeastern` | Northeastern University (Lazer Lab) | `workday` | `northeastern.wd1.myworkdayjobs.com`, site `careers` | 365 days | Local test: 67 found, 61 inserted, 13 pending for review |
| `wd-usc` | University of Southern California (USC Dornsife) | `workday` | `usc.wd5.myworkdayjobs.com`, site `ExternalUSCCareers` | 365 days | Local test: 26 found, 23 inserted, 5 pending |
| `wd-yale` | Yale University (Human Nature Lab) | `workday` | `yale.wd1.myworkdayjobs.com`, site `external_career_site` (Yale's front end is Phenom People; its apply links reveal Workday) | 365 days | Local test: 9 found, 9 inserted, 1 pending |
| `oracle-stanford` | Stanford University (IRiSS) | `oracle-recruiting` | `careersearch.stanford.edu`, site `stanford` | 365 days | Local test: 82 found, 63 inserted, 6 pending (2 accepted by the AI). **New adapter**; the link check reads Stanford's REST service |
| `wd-american` | American University | `workday` | `american.wd1.myworkdayjobs.com`, site `AU` | 365 days | Added 2026-11-26. Search test: 2 found before filtering |
| `wd-byu` | Brigham Young University | `workday` | `byu.wd1.myworkdayjobs.com`, site `faculty-careers` | 365 days | Added 2026-11-26. Search test: 0 found before filtering |
| `wd-clemson` | Clemson University | `workday` | `clemson.wd12.myworkdayjobs.com`, site `Clemson_Careers` | 365 days | Added 2026-11-26. Search test: 0 found before filtering |
| `wd-dartmouth` | Dartmouth College | `workday` | `dart.wd1.myworkdayjobs.com`, site `DART` | 365 days | Added 2026-11-26. Search test: 0 found before filtering |
| `wd-georgetown` | Georgetown University | `workday` | `georgetown.wd1.myworkdayjobs.com`, site `Georgetown_Faculty` | 365 days | Added 2026-11-26. Search test: 0 found before filtering |
| `wd-pennstate` | Pennsylvania State University | `workday` | `psu.wd1.myworkdayjobs.com`, site `PSU_Academic` | 365 days | Added 2026-11-26. Search test: 17 found before filtering |
| `wd-utaustin` | University of Texas at Austin | `workday` | `utaustin.wd1.myworkdayjobs.com`, site `UTstaff` | 365 days | Added 2026-11-26. Search test: 34 found before filtering |
| `wd-wustl` | Washington University in St. Louis | `workday` | `wustl.wd1.myworkdayjobs.com`, site `External` | 365 days | Added 2026-11-26. Search test: 8 found before filtering |
| `wd-rochester` | University of Rochester | `workday` | `rochester.wd5.myworkdayjobs.com`, site `UR_Staff` | 365 days | Added 2026-11-26. Search test: 17 found before filtering |
| `wd-mcgill` | McGill University | `workday` | `mcgill.wd3.myworkdayjobs.com`, site `McGill_Careers` | 365 days | Added 2026-11-26. Search test: 20 found before filtering |
| `wd-sydney` | University of Sydney | `workday` | `usyd.wd105.myworkdayjobs.com`, site `USYD_EXTERNAL_CAREER_SITE` | 365 days | Added 2026-11-26. Search test: 1 found before filtering |
| `wd-melbourne` | University of Melbourne | `workday` | `unimelb.wd105.myworkdayjobs.com`, site `UoM_External_Career` | 365 days | Added 2026-11-26. Search test: 4 found before filtering |
| `oracle-rice` | Rice University | `oracle-recruiting` | `emdz.fa.us2.oraclecloud.com`, site `CX_2001` | 365 days | Added 2026-11-26. Search test: 22 found before filtering |
| `sr-notredame` | University of Notre Dame | `smartrecruiters` | `api.smartrecruiters.com`, company `UniversityOfNotreDame` | 365 days | Added 2026-11-26. Search test: 9 found, all usable. **New reader**: redeploy `ingest-jobs` first |
| `oracle-dtu` | Technical University of Denmark | `oracle-recruiting` | `efzu.fa.em2.oraclecloud.com`, site `CX_2001` | 365 days | Added 2026-11-26. Search test: 36 found before filtering, including postdocs and PhD positions |
| `peopleadmin-unc` | University of North Carolina at Chapel Hill | `peopleadmin` | `unc.peopleadmin.com` | 365 days | Added 2026-11-26. Search test: 3 found. **New reader**: redeploy `ingest-jobs` first |
| `atom-uvm` | University of Vermont (Computational Story Lab) | `peopleadmin` | `uvmjobs.com` | 365 days | Switched on 2026-11-26 with the new PeopleAdmin reader. Search test: 0 found (nothing open for the terms) |
| `sf-duke` | Duke University | `successfactors` | `careers.duke.edu` | 365 days | Added 2026-11-26 with the new SuccessFactors reader. Reads the sitemap, opens jobs with an academic title (up to 40). **New reader**: redeploy `ingest-jobs` first |
| `sf-purdue` | Purdue University | `successfactors` | `careers.purdue.edu` | 365 days | Added 2026-11-26 with the new SuccessFactors reader. Reads the sitemap, opens jobs with an academic title (up to 60). **New reader**: redeploy `ingest-jobs` first |
| `sf-delfttechnology` | Delft University of Technology | `successfactors` | `careers.tudelft.nl` | 365 days | Added 2026-11-26 with the new SuccessFactors reader. Reads the sitemap, opens jobs with an academic title (up to 50). **New reader**: redeploy `ingest-jobs` first |
| `sf-vienna` | University of Vienna | `successfactors` | `jobs.univie.ac.at` | 365 days | Added 2026-11-26 with the new SuccessFactors reader. Reads the sitemap, opens jobs with an academic title (up to 60; German title words added). **New reader**: redeploy `ingest-jobs` first |
| `sf-toronto` | University of Toronto | `successfactors` | `jobs.utoronto.ca` | 365 days | Added 2026-11-26 with the new SuccessFactors reader. Reads the sitemap, opens jobs with an academic title (up to 60). **New reader**: redeploy `ingest-jobs` first |
| `uc-ucberkeley` | UC Berkeley | `uc-recruit` | `aprecruit.berkeley.edu/apply` | 730 days | Added 2026-11-26 with the new University of California reader. Reads the campus list of open academic recruitments, opens data, computing and social-science ones first (up to 60). **New reader**: redeploy `ingest-jobs` first |
| `uc-ucdavis` | UC Davis | `uc-recruit` | `recruit.ucdavis.edu/apply` | 730 days | Added 2026-11-26 with the new University of California reader. Reads the campus list of open academic recruitments, opens data, computing and social-science ones first (up to 60). **New reader**: redeploy `ingest-jobs` first |
| `uc-ucsandiego` | UC San Diego | `uc-recruit` | `apol-recruit.ucsd.edu/apply` | 730 days | Added 2026-11-26 with the new University of California reader. Reads the campus list of open academic recruitments, opens data, computing and social-science ones first (up to 60). **New reader**: redeploy `ingest-jobs` first |
| `uc-ucla` | UCLA | `uc-recruit` | `recruit.apo.ucla.edu/apply` | 730 days | Added 2026-11-26 with the new University of California reader. Reads the campus list of open academic recruitments, opens data, computing and social-science ones first (up to 60). **New reader**: redeploy `ingest-jobs` first |
| `todo-collegeofwilliamandmary` | William & Mary | `workday` | `williammary.wd12.myworkdayjobs.com`, site `WM` | 365 days | Added 2026-11-27. Search test: 11 found. Redeploy `ingest-jobs` first |
| `todo-indiana` | Indiana University | `peopleadmin` | `indiana.peopleadmin.com` | 365 days | Added 2026-11-27. Search test: 6 found. Redeploy `ingest-jobs` first |
| `todo-rutgers` | Rutgers University | `peopleadmin` | `jobs.rutgers.edu` | 365 days | Added 2026-11-27. Search test: 13 found. Redeploy `ingest-jobs` first |
| `todo-ethzurich` | ETH Zurich | `html-jobs` | `jobs.ethz.ch`, links `/job/view/` | 365 days | Added 2026-11-27. Up to 40 per night, academic titles only. **New reader**. Redeploy `ingest-jobs` first |
| `hrm-itcopenhagen` | IT University of Copenhagen | `html-jobs` | HR-Manager list `customer=ituniversitetet` | 365 days | Added 2026-11-27. Full advert text read from `AdvertisementContent`. **New reader**. Redeploy `ingest-jobs` first |
| `todo-wzbberlinsocialsciencecenter` | WZB Berlin Social Science Center | `html-jobs` | `wzb.helixjobs.com` | 365 days | Added 2026-11-27. Few postings (1 at the time of testing). **New reader**. Redeploy `ingest-jobs` first |
| `jobsacuk` | UK universities on jobs.ac.uk (Oxford, Cambridge, King's, LSE, Bristol, Loughborough) | `html-jobs` | `jobs.ac.uk/sitemap.xml`, employer filter | 365 days | Added 2026-11-27. Opens up to 140 jobs (subject words first) and keeps the six employers: 42 found in a test. These six institutions' own rows stay off. Redeploy `ingest-jobs` first |
| `own-houston` | University of Houston | `html-jobs` | `careers.uh.edu/sitemap.xml` | 365 days | Added 2026-11-27. **Unreliable**: an AWS bot challenge (HTTP 202) blocks most pages, so expect few jobs. Reads 15 a night with the 5 second delay its robots.txt asks for. Redeploy `ingest-jobs` first |
| `todo-coloradoboulder` | University of Colorado Boulder | `html-jobs` | `jobs.colorado.edu/jobs/SearchJobs` | 365 days | Added 2026-11-27. 25 a night from the paged list; 40 in a test. Redeploy `ingest-jobs` first |
| `todo-konstanz` | University of Konstanz | `html-jobs` | `stellen.uni-konstanz.de/sitemap.xml.gz` | 365 days | Added 2026-11-27. 16 found in a test. Redeploy `ingest-jobs` first |
| `todo-maxplanckinstituteforhumandeve` | Max Planck Institute for Human Development | `html-jobs` | `careers.mpib-berlin.mpg.de/jobs` | 365 days | Added 2026-11-27. 5 found in a test. Redeploy `ingest-jobs` first |

The Workday and Oracle sources search for CSS terms ("computational social science", "social data science",
"computational sociology", and for Northeastern "network science") before anything is downloaded.

### 1.2 Registered but inactive

Registered so they are visible and one switch away; the importer skips them. Each says why in `config.status`
and `config.note`. To switch one on after it is fixed: `UPDATE job_sources SET is_active = true WHERE slug = '...';`

| Slug | Host (lab or center) | Careers system | Status | Why, and what is needed |
|------|----------------------|----------------|--------|-------------------------|
| `pageup-columbia` | Columbia University (Data Science Institute) | PageUp | **Blocked** | An AWS bot challenge answers automated requests with HTTP 202 and a JavaScript page. Ask Columbia HR to allow `CSSJobsBot`, then write a PageUp reader |
| `pageup-umass` | UMass Amherst (CSSI) | PageUp | **Blocked** | The same AWS bot challenge as Columbia |
| `harvard` | Harvard (Computational Policy Lab, Kennedy School) | Not identified | **Blocked** | The jobs page answers HTTP 403 to automated requests |
| `tugraz` | Graz University of Technology | JavaScript app (`jobs.tugraz.at`) | Needs an adapter | No public data endpoint or feed found |
| `koc` | Koç University (CCSS) | Not identified | **Blocked** | HTTP 403 to automated requests |
| `gesis` | GESIS | Not identified | **Blocked** | HTTP 403 to automated requests |
| `cuhk` | The Chinese University of Hong Kong | Not identified | Unverified | The Personnel Office address did not resolve from the network it was checked on |
| `microsoft-research` | Microsoft Research | Eightfold | **Unreliable** | Its search API (`apply.careers.microsoft.com/api/pcsx/search`) answered once with data on 2026-11-07 and then nothing, after an HTTP 429 earlier. It is rate limited, so a reader needs slow, patient requests; read Microsoft's terms first |

Carnegie Mellon (`wd-cmu`) is not seeded in production: its Workday search returns HTTP 422 on every run.

---

## 2. Boards and aggregators investigated

| Source | Status | Notes |
|--------|--------|-------|
| jobRxiv | Works locally, blocked from Supabase | Real RSS with structured location, type and company. `posts_per_page=100` works; `paged` does not. Rate-limits (HTTP 429) if hit quickly. Needs an allow-list from jobRxiv or a different network (see [HANDBOOK > Known issues](HANDBOOK.md#known-issues-and-future-work)) |
| CoMSES Net | Working | RSS with no structured institution or location; institution is recovered from the text. Lists old postings. The feed escapes its HTML twice (handled) |
| Workday university sites | Working | The public JSON search. A removed posting answers 404, or 403 for some tenants |
| Euraxess | No read API | Its XML guidelines are for submitting jobs. No RSS or JSON export; would need HTML scraping |
| HigherEdJobs | Blocked | Documented category feeds return an Imperva/Incapsula bot-protection page instead of RSS |
| jobs.ac.uk | Feeds moved | `/feeds` 404s. `robots.txt` is permissive and a sitemap exists (about 8,000 URLs), so a sitemap-based adapter is possible but needs per-page HTML parsing |
| Nature Careers / AJO | Not RSS | HTML only at the URLs tried; needs more investigation |
| LinkedIn / Indeed | Excluded | Scraping is prohibited by their terms of service |

---

## 3. CSS community directory

### 3.1 The Penn CSS Lab community page

[css.engineering.upenn.edu/about/community](https://css.engineering.upenn.edu/about/community/)
describes the field as "shaped by multiple actors and organizations". It names three
flagship programmes, then lists other labs and centers (the logo grid).

| Programme | What it is | Address | Jobs relevance |
|-----------|------------|---------|----------------|
| **IC2S2**, the International Conference on Computational Social Science | The premier annual meeting for researchers using computational and data-intensive methods on societal problems | [ic2s2.org](https://www.ic2s2.org/) (the page links the 2025 site, [ic2s2-2025.org](https://www.ic2s2-2025.org/)) | Blocks automated requests (HTTP 403). A natural place to announce the board and to find hiring groups |
| **SICSS**, the Summer Institutes in Computational Social Science | Two weeks of training for graduate students, postdocs and junior faculty; more than 1,200 scholars since 2017 | [sicss.io](https://sicss.io/) | See [3.4](#34-sicss) |
| **varyCSS** | Resources and a scholar database supporting new and emerging CSS scholars underrepresented in the field | [varycss.org](http://varycss.org/) | See [3.3](#33-varycss) |

The same page also links the Penn schools behind the lab ([SEAS](https://www.seas.upenn.edu/),
[Annenberg](https://www.asc.upenn.edu/) and [Wharton](https://www.wharton.upenn.edu/)),
and the lab's own **[research assistant positions](https://css.engineering.upenn.edu/research-assistant-positions/)**
page (for Penn students; a very short page, no feed).

### 3.2 Other CSS labs and centers

The logo grid on that page, in the order shown. "Address" is the one currently in use (the Penn page's links
have moved for several, and these are the corrected ones). "Status" is what it returned on 2026-11-07. The last
column is how the lab's **host institution** is covered as a job source (section 1).

| # | Lab or center | Host | Address | Status | Host's job source |
|---|---------------|------|---------|--------|-------------------|
| 1 | The Warren Center for Network & Data Sciences | University of Pennsylvania | [warrencenter.upenn.edu](https://warrencenter.upenn.edu/) | OK | `wd-upenn`, active |
| 2 | Wharton Analytics: Computational Social Science | Wharton, University of Pennsylvania | [ai-analytics.wharton.upenn.edu/computational-social-science](https://ai-analytics.wharton.upenn.edu/computational-social-science/) | **404** (the site root, [ai-analytics.wharton.upenn.edu](https://ai-analytics.wharton.upenn.edu/), works) | `wd-upenn`, active |
| 3 | Lazer Lab | Northeastern University | [lazerlab.net/publication/computational-social-science](https://www.lazerlab.net/publication/computational-social-science) | **404** (the root, [lazerlab.net](https://www.lazerlab.net/), works) | `wd-northeastern`, active |
| 4 | Human Nature Lab | Yale University | [humannaturelab.net/computational-social-science](https://humannaturelab.net/computational-social-science) | OK. Its own [Open Positions](https://humannaturelab.net/open-positions) page | `wd-yale`, active |
| 5 | IRiSS Computational Social Science | Stanford University | [iriss.stanford.edu/.../computational-social-science](https://iriss.stanford.edu/user/login?destination=/research-centers/computational-social-science) | OK (a login-redirect address) | `oracle-stanford`, active |
| 6 | CSS Lab | TU Graz, Austria | [tugraz.at/institute/hcc/.../css-lab](https://www.tugraz.at/institute/hcc/research/research-groups/computational-social-science-lab-css-lab/) | **404** | `tugraz`, inactive (needs an adapter) |
| 7 | Computational Social Science Lab | USC | [dornsife.usc.edu](https://dornsife.usc.edu/) | OK | `wd-usc`, active |
| 8 | ILCSS, Interdisciplinary Lab for Computational Social Science | University of Maryland | [ilcss.umd.edu](https://ilcss.umd.edu/) | OK | `wd-umd`, active (since the first import) |
| 9 | Computational Social Science group | Columbia Data Science Institute | [datascience.columbia.edu/.../computational-social-science](https://datascience.columbia.edu/research/groups/computational-social-science/) | **HTTP 403** to automated requests | `pageup-columbia`, inactive (blocked) |
| 10 | CSS Lab | University of Toronto, Computer Science | [csslab.cs.toronto.edu](https://csslab.cs.toronto.edu/) | OK. Positions appear as blog posts, and the site advertises a feed | `sf-toronto`, inactive (needs an adapter) |
| 11 | Computational Policy Lab | Harvard Kennedy School (the lab previously listed at Stanford) | [policylab.hks.harvard.edu](https://policylab.hks.harvard.edu/) | OK | `harvard`, inactive (blocked) |
| 12 | Microsoft Research: Computational Social Science | Microsoft | [microsoft.com/.../computational-social-science](https://www.microsoft.com/en-us/research/theme/computational-social-science/) | OK. [Careers](https://www.microsoft.com/en-us/research/careers/) | `microsoft-research`, inactive (blocked) |
| 13 | Computational Social Science Institute (CSSI) | UMass Amherst | [cssi.umass.edu](https://www.cssi.umass.edu/) | OK. Its [Join Us](http://www.cssi.umass.edu/join) page | `pageup-umass`, inactive (blocked) |
| 14 | Center for Computational Social Sciences (CCSS) | Koç University, Turkey | [research.ku.edu.tr/.../ccss](https://research.ku.edu.tr/research-infrastructure/research-centers-and-units/ccss/) | **HTTP 403** | `koc`, inactive (blocked) |
| 15 | GESIS: Computational Social Science department | GESIS Leibniz Institute for the Social Sciences, Germany | [gesis.org/.../computational-social-science](https://www.gesis.org/en/institute/about-us/departments/computational-social-science) | **HTTP 403** | `gesis`, inactive (blocked) |
| 16 | Computational Social Science @ CUHK | The Chinese University of Hong Kong | [cssl.socsc.cuhk.edu.hk](https://cssl.socsc.cuhk.edu.hk/) | OK | `cuhk`, inactive (unverified) |
| 17 | Computational Story Lab | University of Vermont | [compstorylab.org](https://www.compstorylab.org/) | OK | `atom-uvm`, inactive (needs an adapter) |

Reading the table: **7 of the 17 labs** are covered through their university's careers site (Penn, Northeastern, Yale, Stanford, USC and Maryland; Wharton and the Warren Center both use Penn's). The rest are registered but inactive. For the ones that block automated requests, the fix is one request to the owner ([section 4](#4-adding-more-sources)).

### 3.3 varyCSS

[varycss.org](http://varycss.org/) ("we exist, because variation matters") keeps a
**Scholars** database (its page returned 404 on 2026-11-06), a **Literature App**, news,
and lists the groups, conferences and workshops below. Contact: varycss@gmail.com;
[GitHub](https://github.com/varycss); [Twitter/X](https://twitter.com/varycss).

#### Groups (25)

The lists below are as published on varyCSS (its footer says 2025). The last column is what each address returned
when checked on 2026-11-06: "blocks automated checks" means the site refused the check and a person can still open it,
while **404** and "no response" mean the address looks stale.

| Group | Website | Checked 2026-11-06 |
|-------|---------|--------------------|
| Algorithmic Justice League | <https://www.ajl.org/> | OK |
| Black Code Collective | <https://www.meetup.com/Black-Code-Collective/> | OK |
| Black in AI | <https://blackinai.github.io/#/> | OK |
| Black Girls Code | <https://www.blackgirlscode.com/> | no response |
| BlackComputerHer | <https://blackcomputeher.org/> | OK |
| Code Corps | <https://www.codecorps.org/> | no response |
| Code Like a Girl | <https://www.codelikeagirl.com/> | OK |
| Color Coded | <https://colorcoded.la/> | OK |
| Distributed AI Research Institute | <https://www.dair-institute.org> | OK |
| Data for Black Lives | <https://d4bl.org/> | OK |
| Design Justice | <https://designjustice.org/> | OK |
| Fairness, Accountability, and Transparency in Machine Learning | <https://fatml.org/> | OK |
| Girls Who Code | <https://girlswhocode.com/> | OK |
| Hack the Hood | <https://www.hackthehood.org/> | OK |
| Institute in Critical Quantitative, Computational & Mixed Metholdogies | <https://www.icqcm.org/> | OK |
| Just Data Lab | <https://www.thejustdatalab.com/> | OK |
| Make it GayeR | <https://rlgbtq.github.io/> | OK |
| Media Justice | <https://mediajustice.org/> | OK |
| #morethancode | <https://morethancode.cc/orglist/> | OK |
| Queer in AI | <https://www.queerinai.com/> | OK |
| R Ladies | <https://rladies.org/> | OK |
| Researc/hers Code | <https://www.researcherscode.com/> | **404** |
| Women in Machine Learning | <https://wimlworkshop.org/> | blocks automated checks |
| Women in Network Science | <https://www.networkscienceinstitute.org/wins> | **404** |
| even more resources from Ruha Benjamin | <https://www.ruhabenjamin.com/resources> | OK |

#### Conferences (9)

| Conference | Website | Checked 2026-11-06 |
|------------|---------|--------------------|
| ACM Conference on Fairness, Accountability, and Transparency (ACM FAccT) | <https://facctconference.org/> | OK |
| ACM Conference on Human Factors in Computing Systems (CHI) | <https://dl.acm.org/conference/chi> | blocks automated checks |
| International AAAI Conference on Web and Social Media (ICWSM) | <https://www.icwsm.org/> | OK |
| International Conference on Computational Social Science (IC2S2) | <https://www.ic2s2.org/> | blocks automated checks |
| International Network of Analytical Sociologists (INAS) Annual Meeting | <https://analyticalsociology.com/> | OK |
| New Directions in Analyzing Text as Data (TADA) | <http://tada2023.org/> | OK |
| NetSci | <https://netscisociety.net/events/netsci> | OK |
| Politics and Computational Social Science (PaCSS) Conference | <https://cssh.northeastern.edu/nulab/pacss/> | OK |
| International Network for Social Network Analysis (Sunbelt) | <https://www.insna.org/> | OK |

#### Workshops and summer schools (5)

| Workshop | Website | Checked 2026-11-06 |
|----------|---------|--------------------|
| Summer Institute in Computational Social Science | <https://sicss.io/> | OK |
| Posit Conference | <https://posit.co/conference/> | OK |
| ICPSR Summer Program in Quantitative Methods of Social Research | <https://www.icpsr.umich.edu/web/pages/sumprog/index.html> | blocks automated checks |
| Microsoft Research Data Science Summer School (for undergrads) | <https://www.microsoft.com/en-us/research/academic-program/data-science-summer-school/> | OK |
| Women in Machine Learning Workshop | <https://wimlworkshop.org/> | blocks automated checks |

These are communities and meetings, not hiring employers. Their value for the board
is **announcing it** (most have mailing lists, job boards or social channels) and
spotting groups that post positions.

### 3.4 SICSS

[sicss.io](https://sicss.io/) runs the Summer Institutes in Computational Social
Science: founded in 2017 by Chris Bail and Matt Salganik, a 501(c)(3) non-profit,
free to attend, with open-source materials. Since 2018 it has run **partner locations**
around the world; 2026 has 27 locations. Contact: rsfcompsocsci@gmail.com;
[YouTube](https://www.youtube.com/@summerinstituteincomputati9729).

**Core sponsors** (shown as logos on the home page): Templeton World Charity
Foundation, the Alfred P. Sloan Foundation, the Russell Sage Foundation, and Facebook
(Meta).

**Pages:** [Locations](https://sicss.io/locations), [Host a location](https://sicss.io/host),
[Learn online](https://sicss.io/overview), [People](https://sicss.io/people),
[Apply](https://sicss.io/apply), [Sponsor SICSS](https://sicss.io/sponsor),
[About](https://sicss.io/about), [Tech for Open Minds](https://sicss.io/tom),
[Post-mortem](https://sicss.io/post-mortem), [In the news](https://sicss.io/in-the-news).

**Host locations, 2017 to 2026.** 188 location pages across ten years, 157 distinct hosts
(29 of them hosted in more than one year). The organisations behind these are
universities, research institutes, NGOs and companies on six continents. Each is a
possible place to hear about CSS positions. The page for a location is linked by its
latest year.

| Location | Host and place | Years hosted | Page |
|----------|----------------|--------------|------|
| Aachen-Graz | Virtual Event | 2022 | [2022](https://sicss.io/2022/aachen-graz) |
| Abu Dhabi | NYU Abu Dhabi | 2023 | [2023](https://sicss.io/2023/abu-dhabi) |
| Accra | University of Ghana | 2023, 2024 | [2024](https://sicss.io/2024/accra) |
| Amsterdam | University of Amsterdam | 2024 | [2024](https://sicss.io/2024/amsterdam) |
| AMU/Law | Adam Mickiewicz University, Poznań | 2026 | [2026](https://sicss.io/2026/amu-law) |
| AMU/Law | Poznan, Poland | 2022, 2024 | [2024](https://sicss.io/2024/amu-law) |
| AMU/Law | Poznań, Poland | 2025 | [2025](https://sicss.io/2025/amu-law) |
| Atlanta | Clark Atlanta University | 2024 | [2024](https://sicss.io/2024/atlanta) |
| Atlanta | Georgia Institute of Technology | 2023 | [2023](https://sicss.io/2023/atlanta) |
| Atlanta | Georgia State University | 2022 | [2022](https://sicss.io/2022/atlanta) |
| Barcelona | Universitat de Barcelona | 2024 | [2024](https://sicss.io/2024/barcelona) |
| Bay Area | Virtual event | 2020 | [2020](https://sicss.io/2020/bay_area) |
| Beijing | Beijing Normal University | 2024 | [2024](https://sicss.io/2024/beijing) |
| Beijing | Renmin University of China | 2023 | [2023](https://sicss.io/2023/beijing) |
| Beijing | Virtual event | 2021 | [2021](https://sicss.io/2021/beijing) |
| Berlin | WZB Berlin Social Science Center | 2023, 2024 | [2024](https://sicss.io/2024/berlin) |
| Bogota | Universidad del Rosario, Bogota, Colombia | 2026 | [2026](https://sicss.io/2026/bogota) |
| Bogotá | Universidad del Rosario-Pontificia Universidad Javeriana | 2025 | [2025](https://sicss.io/2025/bogota) |
| Bologna | University of Bologna | 2022, 2024 | [2024](https://sicss.io/2024/bologna) |
| Bologna | Virtual event | 2021 | [2021](https://sicss.io/2021/bologna) |
| Boston | Boston, Massachussetts | 2019 | [2019](https://sicss.io/2019/boston) |
| Brazil | FGV Communication, Brazil | 2026 | [2026](https://sicss.io/2026/brazil) |
| Buenos Aires | National University of San Martín, Buenos Aires, Argentina | 2026 | [2026](https://sicss.io/2026/buenos-aires) |
| Calabar | University of Calabar | 2023, 2024 | [2024](https://sicss.io/2024/calabar) |
| Chicago | Northwestern University | 2024 | [2024](https://sicss.io/2024/chicago) |
| Chicago | Virtual event | 2021 | [2021](https://sicss.io/2021/chicago) |
| Chicago - Chicago State University | Chicago State University | 2026 | [2026](https://sicss.io/2026/chicago---chicago-state-university) |
| Chile | Santiago, Chile | 2023, 2024 | [2024](https://sicss.io/2024/chile) |
| CMU | Pittsburgh, PA | 2025 | [2025](https://sicss.io/2025/cmu) |
| Covenant | Covenant University, Nigeria | 2022 | [2022](https://sicss.io/2022/covenant-university) |
| Delhi | Ashoka University & CSIR-CSIO | 2022 | [2022](https://sicss.io/2022/delhi) |
| Duke University | Durham, North Carolina | 2018, 2022 | [2022](https://sicss.io/2022/duke) |
| Duke University | Virtual event | 2020 | [2020](https://sicss.io/2020/duke) |
| Edinburgh | Edinburgh, United Kingdom | 2025 | [2025](https://sicss.io/2025/edinburgh) |
| Edinburgh | University of Edinburgh | 2022, 2023 | [2023](https://sicss.io/2023/edinburgh) |
| ETH Zurich | Zürich, Switzerland | 2019 | [2019](https://sicss.io/2019/ethzurich) |
| FGV/DAPP Brazil | Virtual Event | 2022 | [2022](https://sicss.io/2022/fgv-dapp-brazil) |
| FGV/DAPP Brazil | Virtual event | 2021 | [2021](https://sicss.io/2021/fgv-dapp-brazil) |
| FGV/ECMI Brazil | Fundacio Getulio Vargas, Rio de Janeiro, Brazil | 2025 | [2025](https://sicss.io/2025/fgv-ecmi-brazil) |
| FGV/ECMI Brazil | Rio de Janeiro, Brazil | 2023, 2024 | [2024](https://sicss.io/2024/fgv-ecmi-brazil) |
| Florida | University of Florida (UF) | 2024 | [2024](https://sicss.io/2024/florida) |
| Florida Atlantic University | Boca Raton, FL | 2026 | [2026](https://sicss.io/2026/fau) |
| Graz | Graz, Austria | 2025 | [2025](https://sicss.io/2025/graz) |
| Habib | Habib University, Karachi, Pakistan | 2026 | [2026](https://sicss.io/2026/habib) |
| Haifa | University of Haifa | 2022 | [2022](https://sicss.io/2022/haifa) |
| Helsinki | University of Helsinki | 2022 | [2022](https://sicss.io/2022/helsinki) |
| Helsinki | Virtual event | 2021 | [2021](https://sicss.io/2021/helsinki) |
| Hong Kong | The Chinese University of Hong Kong | 2022 | [2022](https://sicss.io/2022/hong-kong) |
| Hong Kong | Virtual event | 2021 | [2021](https://sicss.io/2021/hong_kong) |
| Howard/Mathematica | Virtual Event | 2022 | [2022](https://sicss.io/2022/howard-mathematica) |
| Howard/Mathematica | Virtual event | 2021 | [2021](https://sicss.io/2021/howard-mathematica) |
| Howard/Mathematica | Washington, D.C. | 2023 | [2023](https://sicss.io/2023/howard-mathematica) |
| HSE University | Virtual event | 2021 | [2021](https://sicss.io/2021/hse) |
| Hunter College | New York, New York | 2018, 2019 | [2019](https://sicss.io/2019/hunter-nyc) |
| IAS | Norrkoping, Sweden | 2023, 2025 | [2025](https://sicss.io/2025/ias) |
| Iceland | University of Iceland | 2024 | [2024](https://sicss.io/2024/iceland) |
| India | IIIT Hyderabad | 2022 | [2022](https://sicss.io/2022/india) |
| Indiana | Purdue University, West Lafayette, IN | 2025 | [2025](https://sicss.io/2025/indiana) |
| IPATC | University of Johannesburg | 2023 | [2023](https://sicss.io/2023/johannesburg) |
| ISSP | Ouagadougou, Burkina Faso | 2025, 2026 | [2026](https://sicss.io/2026/issp) |
| Istanbul | Istanbul, Turkey | 2023 | [2023](https://sicss.io/2023/istanbul) |
| Istanbul | Istanbul, Turkiye | 2026 | [2026](https://sicss.io/2026/istanbul) |
| Istanbul | Virtual event | 2020, 2021 | [2021](https://sicss.io/2021/istanbul) |
| JIAS/IPATC | University of Johannesburg | 2022 | [2022](https://sicss.io/2022/jias) |
| Jogja | Universitas Islam Indonesia | 2022 | [2022](https://sicss.io/2022/jogja) |
| Johannesburg | University of Johannesburg, South Africa | 2026 | [2026](https://sicss.io/2026/johannesburg) |
| Kadir Has University | Istanbul, Turkey | 2019 | [2019](https://sicss.io/2019/istanbul) |
| Kenya | AICAD, Kenya | 2025 | [2025](https://sicss.io/2025/kenya) |
| Kenya | Nairobi, Kenya | 2026 | [2026](https://sicss.io/2026/kenya) |
| Korea | KAIST / KDI - South Korea | 2025 | [2025](https://sicss.io/2025/korea) |
| Korea | Korea Advanced Institute of Science and Technology (KAIST) | 2023, 2024 | [2024](https://sicss.io/2024/korea) |
| Korea | Korea Institute of Science and Technology (KAIST) | 2022 | [2022](https://sicss.io/2022/korea) |
| Lake Como | Como, Italy | 2025 | [2025](https://sicss.io/2025/lake-como) |
| Law | Virtual event | 2021 | [2021](https://sicss.io/2021/law) |
| Lingnan | Hong Kong SAR | 2025 | [2025](https://sicss.io/2025/lingnan) |
| Lisbon | Nova School of Business and Economics | 2022 | [2022](https://sicss.io/2022/lisbon) |
| Lisbon | Virtual event | 2021 | [2021](https://sicss.io/2021/lisbon) |
| London | Imperial College London | 2022 | [2022](https://sicss.io/2022/london) |
| London | London, United Kingdom | 2025 | [2025](https://sicss.io/2025/london) |
| London | Virtual event | 2021 | [2021](https://sicss.io/2021/london) |
| Los Angeles | Virtual event | 2021 | [2021](https://sicss.io/2021/los_angeles) |
| Maastricht | Virtual event | 2020 | [2020](https://sicss.io/2020/maastricht) |
| Melbourne | Melbourne, Australia | 2026 | [2026](https://sicss.io/2026/melbourne) |
| Minnesota | Gustavus Adolphus College - Saint Peter, MN | 2025 | [2025](https://sicss.io/2025/minnesota) |
| Montreal | Virtual event | 2020 | [2020](https://sicss.io/2020/montreal) |
| Montréal | Montréal, Québec, Canada | 2023 | [2023](https://sicss.io/2023/montreal) |
| Montréal | Virtual event | 2021 | [2021](https://sicss.io/2021/montreal) |
| Munich | University of Munich | 2023 | [2023](https://sicss.io/2023/munich) |
| Nairobi/Mathematica | University of Nairobi | 2024 | [2024](https://sicss.io/2024/nairobi-mathematica) |
| NDSU | Fargo, North Dakota | 2023 | [2023](https://sicss.io/2023/ndsu) |
| New York University | New York, New York | 2018 | [2018](https://sicss.io/2018/nyu-nyc) |
| NIGERIA | Uyo, Nigeria | 2026 | [2026](https://sicss.io/2026/uyo) |
| North Dakota State University | Fargo, North Dakota | 2022 | [2022](https://sicss.io/2022/ndsu) |
| NYU Shanghai | Pudong, Shanghai, China | 2025 | [2025](https://sicss.io/2025/nyu-shanghai) |
| NYU Shanghai | Shanghai, China | 2023, 2026 | [2026](https://sicss.io/2026/nyu-shanghai) |
| NYU Silver | New York City | 2023 | [2023](https://sicss.io/2023/nyu-nyc) |
| ODISSEI | Erasmus University Rotterdam, Netherlands | 2022 | [2022](https://sicss.io/2022/odissei) |
| ODISSEI | Rotterdam, Netherlands | 2023 | [2023](https://sicss.io/2023/odissei) |
| ODISSEI | Rotterdam, the Netherlands | 2025, 2026 | [2026](https://sicss.io/2026/odissei) |
| ODISSEI | University of Rotterdam | 2024 | [2024](https://sicss.io/2024/odissei) |
| Oxford | Oxford University | 2022 | [2022](https://sicss.io/2022/oxford) |
| Oxford | Virtual event | 2021 | [2021](https://sicss.io/2021/oxford) |
| Oxford University | Oxford, United Kingdom | 2019 | [2019](https://sicss.io/2019/oxford) |
| Paris | Institut Polytechnique de Paris | 2022, 2023 | [2023](https://sicss.io/2023/paris) |
| Paris | Palaiseau, France | 2025 | [2025](https://sicss.io/2025/paris) |
| Penn | Philadelphia, PA | 2023 | [2023](https://sicss.io/2023/penn) |
| Penn | University of Pennsylvania | 2022, 2024 | [2024](https://sicss.io/2024/penn) |
| Penn | University of Pennsylvania, Philadelphia | 2025, 2026 | [2026](https://sicss.io/2026/penn) |
| Princeton University | Princeton, New Jersey | 2017, 2019 | [2019](https://sicss.io/2019/princeton) |
| Princeton University | Virtual event | 2021 | [2021](https://sicss.io/2021/princeton) |
| Rochester | Rochester, NY | 2025, 2026 | [2026](https://sicss.io/2026/rochester) |
| Rochester | University of Rochester | 2023, 2024 | [2024](https://sicss.io/2024/rochester) |
| Roma Tor Vergata | University of Roma Tor Vergata | 2023 | [2023](https://sicss.io/2023/roma-tor-vergata) |
| Roma Tor Vergata | University of Rome Tor Vergata | 2022 | [2022](https://sicss.io/2022/roma-tor-vergata) |
| RTI International | Research Triangle Park, North Carolina | 2019 | [2019](https://sicss.io/2019/rtp) |
| Rutgers | New Brunswick, NJ | 2026 | [2026](https://sicss.io/2026/rutgers) |
| Rutgers | Rutgers University | 2022, 2024 | [2024](https://sicss.io/2024/rutgers) |
| Rutgers | Virtual event | 2020, 2021 | [2021](https://sicss.io/2021/rutgers) |
| Saarbrücken | Saarbrücken, Germany | 2025 | [2025](https://sicss.io/2025/saarbrucken) |
| Sharjah | Online | 2026 | [2026](https://sicss.io/2026/sharjah) |
| Singapore | National University of Singapore | 2023, 2024, 2025 | [2025](https://sicss.io/2025/singapore) |
| Singapore | National University of Singapore (NUS) | 2022 | [2022](https://sicss.io/2022/singapore) |
| Singapore | Singapore | 2026 | [2026](https://sicss.io/2026/singapore) |
| South Florida | Florida Atlantic University | 2023 | [2023](https://sicss.io/2023/south-florida) |
| Stanford | Stanford University | 2026 | [2026](https://sicss.io/2026/stanford) |
| Stanford | Stanford, California | 2025 | [2025](https://sicss.io/2025/stanford) |
| Stellenbosch | Virtual event | 2020, 2021 | [2021](https://sicss.io/2021/stellenbosch) |
| Sydney | University of Sydney | 2022 | [2022](https://sicss.io/2022/sydney) |
| Syracuse | Syracuse University | 2023 | [2023](https://sicss.io/2023/syracuse) |
| Taipei, Taiwan (National Chengchi University) | Virtual event | 2021 | [2021](https://sicss.io/2021/taiwan) |
| Taiwan | National Chengchi University | 2022 | [2022](https://sicss.io/2022/taiwan) |
| Tokyo | Virtual Event | 2022, 2023 | [2023](https://sicss.io/2023/tokyo) |
| Tokyo | Virtual event | 2021 | [2021](https://sicss.io/2021/tokyo) |
| Tucson | Virtual event | 2020 | [2020](https://sicss.io/2020/tucson) |
| UCLA | Los Angeles, California | 2023 | [2023](https://sicss.io/2023/ucla) |
| UCLA | University of Los Angeles | 2024, 2025, 2026 | [2026](https://sicss.io/2026/ucla) |
| UCLA | Virtual event | 2020 | [2020](https://sicss.io/2020/los_angeles) |
| UDC | University of the District of Columbia, Washington, D.C. | 2026 | [2026](https://sicss.io/2026/udc) |
| UF | University of Florida (CJC) | 2026 | [2026](https://sicss.io/2026/uf) |
| United Arab Emirates (Coming Soon!) | American University of Sharjah | 2024 | [2024](https://sicss.io/2024/tbd) |
| Universidad Autonoma de Nuevo Leon | Monterrey, Mexico | 2019 | [2019](https://sicss.io/2019/monterrey) |
| University of Bamberg | Bamberg, Germany | 2019 | [2019](https://sicss.io/2019/bamberg) |
| University of Boulder | Boulder, Colorado | 2018 | [2018](https://sicss.io/2018/boulder) |
| University of California at Los Angeles | Los Angeles, California | 2019 | [2019](https://sicss.io/2019/los-angeles) |
| University of Cape Town | Cape Town, South Africa | 2019 | [2019](https://sicss.io/2019/capetown) |
| University of Capetown | Capetown, South Africa | 2018 | [2018](https://sicss.io/2018/capetown) |
| University of Chicago | Chicago, Illinois | 2018, 2019 | [2019](https://sicss.io/2019/chicago) |
| University of Helsinki | Helsinki, Finland | 2018 | [2018](https://sicss.io/2018/helsinki) |
| University of Rochester | Rochester, New York | 2022 | [2022](https://sicss.io/2022/rochester) |
| University of Washington | Seattle, Washington | 2018 | [2018](https://sicss.io/2018/seattle) |
| Uruguay | University of the Republic (Udelar) | 2024 | [2024](https://sicss.io/2024/uruguay) |
| Uruguay | University of the Republic (Udelar), Montevideo, Uruguay | 2026 | [2026](https://sicss.io/2026/uruguay) |
| UW | Seattle, WA | 2026 | [2026](https://sicss.io/2026/uw) |
| West/Central Africa | Douala, Cameroon | 2022 | [2022](https://sicss.io/2022/west-central-africa) |
| WITS-StAndrews | Johannesburg, South Africa | 2025 | [2025](https://sicss.io/2025/wits-standrews) |
| WITS-StAndrews | Johnannesburg, South Africa | 2026 | [2026](https://sicss.io/2026/wits-standrews) |
| Zürich | Virtual event | 2021 | [2021](https://sicss.io/2021/ethzurich) |

---

## 4. Adding more sources

The how-to steps are in [INGESTION.md > How-to guides](INGESTION.md#how-to-guides). What to do next, by effort:

1. **Switch on the blocked sources by asking the owners.** One message, from ISCSS, to Columbia, UMass Amherst, Harvard, Koç, GESIS and jobRxiv: the importer reads the public careers pages once a day and identifies itself as `CSSJobsBot`. Columbia and UMass then also need a PageUp reader.
2. **Write the missing readers**, each about a day with tests (SAP SuccessFactors, PeopleAdmin and the University of California system are done): Eploy, HR-Manager, a plain page reader for labs that list openings on a static page (Human Nature Lab's Open Positions, CSSI's Join Us).
3. **More Workday universities** are one row each (see [INGESTION.md](INGESTION.md#add-a-source-that-an-existing-adapter-can-read)). When a university's careers site is not obviously Workday, look at a job's apply link: Yale's front end is Phenom People, but its apply links point at Workday.
4. **Microsoft Research** needs its terms read first.
5. **Announcing the board.** varyCSS, the SICSS location hosts and the conference lists above are where to tell people the board exists.

**The message to send a site that blocks the importer** (jobRxiv, Columbia, UMass Amherst, Harvard, Koç, GESIS). Send it from an ISCSS address to the site's web, IT or HR contact:

> Subject: Allowing a small, polite job reader for the ISCSS job board
>
> Hello,
>
> I help run the job board of the International Society for Computational Social Science (https://jobs.iscss.org). Once a day, a small program reads your public job listings [for jobRxiv: your public job feed at https://jobrxiv.org/?feed=job_feed] and links candidates back to your own page to apply. It makes a few dozen requests a day, one at a time with pauses, and identifies itself as `CSSJobsBot/1.0 (+https://jobs.iscss.org; contact: admin@iscss.org)`. It does not log in, and it does not copy anything that is not already public.
>
> Your site currently answers it with an error ([HTTP 403 / a bot check]), so your listings cannot reach people looking for computational social science positions. Could you allow that user agent, or tell us the feed or data service you would prefer we use? If you would rather we did not read your listings at all, please say so and we will remove the source.
>
> Thank you,
> [name], ISCSS (admin@iscss.org)

**Before adding any source:** check its terms and `robots.txt`, keep the request rate low,
keep the `CSSJobsBot` user agent, and remember that every imported job still waits for an
admin to approve it.

---

## 5. Institutions suggested on 2026-11-26

Alex asked for these 92 institutions to be covered as job sources, as a goal. "Covered" means the importer reads the institution's own careers site every night, so its postings reach the review queue.

**Every one of the 92 is now in the `job_sources` table** (migrations `20260820000000` to `20260826000000`). **52 are covered every night** (46 read directly and the 6 UK universities through jobs.ac.uk). The other **40 are registered but switched off**, each with its reason in `config.note`; a source cannot produce jobs until the importer has a reader for its hiring system, and flipping one on without a reader only logs an error.

- **11 were already read:** Brown University, Cornell University, Northeastern University, Ohio State University, Stanford University, University of Chicago, University of Maryland, University of Southern California, University of Washington, University of Wisconsin–Madison, Yale University.
- **41 added or switched on 2026-11-26/27:** American University, Brigham Young University, Clemson University, Dartmouth College, Duke University, Delft University of Technology, ETH Zurich, IT University of Copenhagen, Indiana University, Rutgers University, William & Mary, WZB Berlin Social Science Center, University of Colorado Boulder, University of Houston (unreliable), University of Konstanz, Max Planck Institute for Human Development, and, through jobs.ac.uk, the University of Oxford, University of Cambridge, King's College London, London School of Economics, University of Bristol and Loughborough University, Georgetown University, McGill University, Pennsylvania State University, Purdue University, Rice University, Technical University of Denmark, University of Melbourne, University of North Carolina, University of Notre Dame, UC Berkeley, UC Davis, UC San Diego, UCLA, University of Rochester, University of Sydney, University of Texas at Austin, University of Toronto, University of Vienna, Washington University in St. Louis. Notes: twelve of these are on Workday (found through each tenant's `robots.txt`); Rice and the Technical University of Denmark are on Oracle Recruiting; Notre Dame is on SmartRecruiters; UNC Chapel Hill is on PeopleAdmin; Duke, Purdue, Delft, Toronto and Vienna are on SuccessFactors; UC Berkeley, Davis, San Diego and UCLA are on the University of California recruitment system. Each was tested with the importer's own reader.
- **6 off for a known reason** ([section 1.2](#12-registered-but-inactive)): Columbia University (blocked by an AWS bot challenge); Harvard University (blocked (HTTP 403)); University of Massachusetts Amherst (blocked by an AWS bot challenge); GESIS – Leibniz Institute for the Social Sciences (blocked (HTTP 403)); Microsoft Research (rate limited; unreliable); Carnegie Mellon University (its Workday search returns HTTP 422).
- **34 registered, off, waiting for a reader** (table below).

**Why they are not all on.** Each hiring system needs its own small reader, and a reader then covers every institution that uses it. The groups below show how much each reader would unlock. Interfolio carries much US faculty hiring but has no public feed we could find (its `robots.txt` is access-denied and its pages are a JavaScript app). For 5 institutions the hiring system still could not be identified, because the careers address tried did not load or named no system; those need someone to look up the real page. For 29 more it is known but the site cannot be read yet (a bot challenge, a form-only search, or a script-built list); the table says which.

### 5.1 Registered, off, waiting for a reader

"Hiring system" is what the institution's careers page or the apply links on the [hiring sheet](#6-the-hiring-sheet) pointed to on 2026-11-26. It is a clue, not a guarantee. To switch one on once it works: `UPDATE job_sources SET is_active = true WHERE slug = '...';`

| Institution | Source slug | Hiring system | Next step |
|-------------|-------------|---------------|-----------|
| Bern University of Applied Sciences | `todo-bernappliedsciences` | Not identified | Identify the hiring system (a short research task), then a reader |
| Bocconi University | `own-bocconi` | Its own hiring site | Needs a reader written for its own site |
| Boston University | `ajo-boston` | Academic Jobs Online (faculty) | Needs a reader |
| Complexity Science Hub Vienna | `personio-complexitysciencehubvienna` | Personio | Find the Personio feed address (reader would be small) |
| Dublin City University | `todo-dublincity` | CoreHR (my.corehr.com/pls/dcurecruit) | Vacancies are on CoreHR, whose search needs a submitted form, so a CoreHR reader is needed (shared with Oxford and UCD) |
| European University Institute | `todo-europeaninstitute` | Own site, PDF notices | Open posts are PDF notices; needs a PDF reader |
| European University Viadrina | `todo-europeanviadrina` | Not identified | Identify the hiring system (a short research task), then a reader |
| George Washington University | `pa-georgewashington` | PeopleAdmin | Reader exists; find this site's Atom feed address |
| Georgia Institute of Technology | `todo-georgia` | Unknown | career.gatech.edu is the student career centre; the staff and faculty jobs site was not found |
| Google | `todo-google` | Not identified | Identify the hiring system (a short research task), then a reader |
| Heinrich Heine University Düsseldorf | `todo-heinrichheinedsseldorf` | Not identified | Identify the hiring system (a short research task), then a reader |
| Hertie School | `todo-hertieschool` | Own site | Lists one or two postings without links; low volume |
| Johns Hopkins University | `ifo-johnshopkins` | Interfolio (faculty) | No public feed found; needs separate investigation |
| Massachusetts Institute of Technology (MIT) | `todo-massachusetts` | Own site (hr.mit.edu/jobs/search) | The job search shows no job links in plain HTML; needs its data address found |
| Max Planck Institute for Security and Privacy | `todo-maxplanckinstituteforsecuritya` | Own site | Career pages mostly say no open positions (calls run in cycles); low value |
| New York University | `ifo-newyork` | Interfolio (faculty) | No public feed found; needs separate investigation |
| Northwestern University | `own-northwestern` | Own site behind Cloudflare | careers.northwestern.edu answers a Cloudflare challenge. Ask Northwestern HR to allow CSSJobsBot |
| Princeton University | `todo-princeton` | Own site behind Cloudflare | Both princeton.edu/acad-positions and jobs.princeton.edu answer a Cloudflare challenge. Ask Princeton HR to allow CSSJobsBot |
| Queensland University of Technology | `todo-queenslandtechnology` | Unknown | qut.edu.au answers HTTP 403 to automated requests. Ask QUT to allow CSSJobsBot |
| Sapienza University of Rome | `todo-sapienzarome` | No central portal found | Calls are scattered over department pages |
| Syracuse University | `todo-syracuse` | sujobopps.com | Staff and faculty postings are on sujobopps.com, which did not answer a plain request; retry from another network |
| Temple University | `todo-temple` | Taleo (temple.taleo.net) | temple.taleo.net/careersection/ex/jobsearch.ftl returns a small JavaScript shell. Needs a Taleo reader |
| University College Dublin | `todo-collegedublin` | CoreHR (my.corehr.com) | The careers page links to CoreHR. The CoreHR search needs a submitted form, so a CoreHR reader is needed (shared with Oxford and DCU) |
| University of Amsterdam | `todo-amsterdam` | Own site (werkenbij.uva.nl) | The site lists job families (for example "Assistant / Associate professor"), not individual vacancies, in its plain HTML |
| University of Bremen | `todo-bremen` | Own central list (job pages /job/<id>) | The list shows no job links in plain HTML; needs its data address found |
| University of Copenhagen | `hrm-copenhagen` | HR-Manager (state recruitment portal) | The portal answers but its vacancy list was empty or used another layout in a test; the same html-jobs reader that works for ITU needs the right list address |
| University of Groningen | `eploy-groningen` | Eploy / own site (werkenbij.rug.nl) | werkenbij.rug.nl lists vacancies by script, with no job links in its plain HTML |
| University of Illinois | `todo-illinois` | Unknown | jobs.illinois.edu answered HTTP 500 and illinois.edu did not load in a test. Retry from another network |
| University of Mannheim | `todo-mannheim` | Own central list (Stellenanzeigen) | The list shows no job links in plain HTML; needs its data address found |
| University of Michigan | `ifo-michigan` | Interfolio (faculty) | No public feed found; needs separate investigation |
| University of Oregon | `pageup-oregon` | PageUp | Check whether it blocks us like Columbia, then a PageUp reader |
| University of St. Gallen | `todo-stgallen` | Own portal (jobs.unisg.ch), script-built list | Script-built list, no sitemap; job pages are /offene-stellen/<title>/<id>. Needs its data address found with a browser |
| University of Zurich | `todo-zurich` | Own portal (jobs.uzh.ch), script-built list | Lists about 127 vacancies with script and has no sitemap; needs its data address found with a browser |
| École Polytechnique (LIX) | `todo-colepolytechnique` | Not identified | Identify the hiring system (a short research task), then a reader |

---

## 6. The hiring sheet

On 2026-11-26 Alex suggested a [Google Sheet](https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6hZ98e4d-lRa-E6OSyceisaalAhWJr2kktBF3JnqoaViRoToPSg5MBByVKu-5Z9NY5RHnNFugZCse/pubhtml) of academic hiring announcements. It is published to the web, so it can be read without signing in. Its title says it has **151 entries across AI, computing, society, health and behavioral science**, reviewed 25 November 2026. Each row has an institution and department, a position, a short description, a deadline, a status ("date guidance"), an application link and notes. About a quarter of the links go to Interfolio.

**A reader exists for it** (adapter `csv-sheet`, [INGESTION.md](INGESTION.md#sources-and-adapters)). It reads the sheet's CSV address, skips rows the sheet itself marks as over (deadline passed, portal closed, posting unavailable), and turns the rest into postings that go through the normal importer: duplicates removed, keyword filter, AI check, then pending for an admin. It is **not switched on**, because of what it found:

| Measured on 2026-11-26 with the real importer | |
|---|---|
| Rows in the sheet | 151 |
| Skipped: the sheet marks them as over | 38 |
| Dropped: a stated deadline has passed | 4 |
| Candidates | 109 |
| AI verdict: accept / borderline / reject | 4 / 82 / 23 |

The sheet is broad hiring news, not computational social science, and its descriptions are short ("Open-rank faculty, tenure-track"), so the AI answers "borderline" for most of it. Switching it on would add about **86 pending jobs**, a few of them good, to a queue of roughly two dozen. The four accepted were Columbia (AI, data science and public policy), Saarland University, and two at UC Irvine. Decisions needed before turning it on:
1. **Is it wanted at that volume?** Options: switch it on and let admins sort; ask the sheet's owner for a column marking the computational social science rows and read only those; or import it once.
2. **Who maintains the sheet, and are they happy for it to be read every night?** It is public, but nothing says who runs it. Ask Alex.

To switch it on (an admin runs this in the SQL Editor; it stays off until you do):

```sql
INSERT INTO job_sources (slug, name, adapter, feed_url, config, max_age_days, is_active) VALUES (
  'hiring-sheet', 'Academic hiring sheet (2026-27)', 'csv-sheet',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6hZ98e4d-lRa-E6OSyceisaalAhWJr2kktBF3JnqoaViRoToPSg5MBByVKu-5Z9NY5RHnNFugZCse/pub?output=csv',
  '{"location": "See posting"}'::jsonb, NULL, true
) ON CONFLICT (slug) DO NOTHING;
```
