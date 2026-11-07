# Sources

Where jobs come from, and the wider computational social science (CSS) community that
could supply more. Part of the [CSS Jobs documentation](../README.md#documentation).

- **Job sources the importer reads today:** [section 1](#1-job-sources-the-importer-reads)
- **Boards and aggregators we looked at:** [section 2](#2-boards-and-aggregators-investigated)
- **The CSS community directory**, taken from the [Penn CSS Lab community page](https://css.engineering.upenn.edu/about/community/), [varyCSS](http://varycss.org/) and [SICSS](https://sicss.io/): [section 3](#3-css-community-directory)
- **Which to add next, and how:** [section 4](#4-adding-more-sources)

How the importer works is in [INGESTION.md](INGESTION.md); how to add a source is in
[INGESTION.md > Adding a source](INGESTION.md#adding-a-source).

> **Checked on 2026-11-06.** Pages move: several links on the Penn community page
> had already changed or block automated requests (noted below). Treat the status
> columns as a snapshot and re-check a site before building an importer for it.
> The community lists were read from the public pages with a handful of polite
> requests and nothing was scraped in bulk.

---

## 1. Job sources the importer reads

These are rows in the `job_sources` table (see [INGESTION.md](INGESTION.md#adding-a-source)).
The first production import ran on 2026-11-04.

| Slug | Source | Adapter | Feed or search address | Max age | First production import |
|------|--------|---------|------------------------|---------|-------------------------|
| `jobrxiv` | [jobRxiv](https://jobrxiv.org/) | `rss-jobrxiv` | `https://jobrxiv.org/?feed=job_feed` | none | **Blocked: HTTP 403** from Supabase's servers (works from other networks). About 760 jobs found locally; 33 relevant |
| `comses` | [CoMSES Net](https://www.comses.net/) | `rss-comses` | `https://www.comses.net/feeds/jobs/rss/` | 180 days | 6 imported (114 of 120 too old) |
| `wd-brown` | Brown University | `workday` | `brown.wd5.myworkdayjobs.com` | 365 days | 1 |
| `wd-cornell` | Cornell University | `workday` | `cornell.wd1.myworkdayjobs.com` | 365 days | 17 |
| `wd-osu` | Ohio State University | `workday` | `osu.wd1.myworkdayjobs.com` | 365 days | 23 |
| `wd-uchicago` | University of Chicago | `workday` | `uchicago.wd5.myworkdayjobs.com` | 365 days | 41 |
| `wd-umd` | University of Maryland | `workday` | `umd.wd1.myworkdayjobs.com` | 365 days | 14 |
| `wd-uva` | University of Virginia | `workday` | `uva.wd1.myworkdayjobs.com` | 365 days | 0 (no matches) |
| `wd-uw` | University of Washington | `workday` | `uw.wd5.myworkdayjobs.com` (job links use `wd5.myworkdaysite.com`) | 365 days | 15 |
| `wd-wisconsin` | University of Wisconsin | `workday` | `wisconsin.wd1.myworkdayjobs.com` | 365 days | 36 |
| `wd-cmu` | Carnegie Mellon University | `workday` | `cmu.wd5.myworkdayjobs.com` | 365 days | **Not seeded.** Its search returns HTTP 422 on every run since at least October 2026 |

The Workday sources search for CSS terms ("computational social science", "social data
science", "computational sociology", and for some "agent-based model" or "network
analysis") before anything is downloaded.

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

The logo grid on that page, in the order shown. "Listed address" is the link the Penn
page gives; "Status" is what it returned on 2026-11-06.

| # | Lab or center | Host | Listed address | Status | Where it posts jobs (found) |
|---|---------------|------|----------------|--------|------------------------------|
| 1 | The Warren Center for Network & Data Sciences | University of Pennsylvania | [warrencenter.upenn.edu](https://warrencenter.upenn.edu/) | OK | No jobs page found; check Penn's careers site |
| 2 | Wharton Analytics: Computational Social Science | Wharton, University of Pennsylvania | `analytics.wharton.upenn.edu/computational-social-science/` | **404, moved** to [ai-analytics.wharton.upenn.edu](https://ai-analytics.wharton.upenn.edu/) | None found |
| 3 | Lazer Lab | Northeastern University | `lazerlab.net/publication/computational-social-science` | **404**; site root [lazerlab.net](https://www.lazerlab.net/) works | None found (`/join` is 404) |
| 4 | Human Nature Lab | Yale University | [humannaturelab.net](https://humannaturelab.net/research-areas/observational-studies-of-social-networks) | OK | **[Open Positions](https://humannaturelab.net/open-positions)** page |
| 5 | IRiSS Computational Social Science | Stanford University | [iriss.stanford.edu/css](https://iriss.stanford.edu/css) | OK | None found; check Stanford's careers site |
| 6 | CSS Lab | TU Graz, Austria | `tugraz.at/institute/isds/.../computational-social-science-lab-css-lab/` | **Moved, now 404** (redirects to `/institute/hcc/...`); needs the new address | Not checked |
| 7 | Computational Social Science Lab | USC Dornsife | [dornsife.usc.edu/labs/cssl](https://dornsife.usc.edu/labs/cssl/) | OK | No jobs page; the site advertises a feed (news, not jobs) |
| 8 | ILCSS, Interdisciplinary Lab for Computational Social Science | University of Maryland | [ilcss.umd.edu](https://ilcss.umd.edu/) | OK | None found. University of Maryland is already a source (`wd-umd`) |
| 9 | Computational Social Science group | Columbia Data Science Institute | [datascience.columbia.edu/.../computational-social-science](https://datascience.columbia.edu/research/groups/computational-social-science/) | **HTTP 403** to automated requests | Not verified |
| 10 | CSS Lab | University of Toronto, Computer Science | [csslab.cs.toronto.edu](http://csslab.cs.toronto.edu/) | OK | **Blog posts announce positions** (for example a 2024 postdoctoral fellow post and a 2023 "Join our group" post); the site advertises an Atom/RSS feed, so `rss-generic` could read it |
| 11 | Stanford Computational Policy Lab | Stanford University | [policylab.stanford.edu](https://policylab.stanford.edu/) | OK | None found (`/join` is 404) |
| 12 | Microsoft Research: Computational Social Science | Microsoft | [microsoft.com/.../computational-social-science](https://www.microsoft.com/en-us/research/theme/computational-social-science/) | OK | [Careers & internships](https://www.microsoft.com/en-us/research/careers/) and [careers.microsoft.com](https://careers.microsoft.com/) |
| 13 | Computational Social Science Institute (CSSI) | UMass Amherst | [cssi.umass.edu](http://www.cssi.umass.edu/) | OK | **[Join Us](http://www.cssi.umass.edu/join)** page |
| 14 | Center for Computational Social Sciences (CCSS) | Koç University, Turkey | `ccss.ku.edu.tr` | **HTTP 403** (redirects to `research.ku.edu.tr/.../ccss/`) | Not verified |
| 15 | GESIS: Computational Social Science department | GESIS Leibniz Institute for the Social Sciences, Germany | [gesis.org/.../computational-social-science](https://www.gesis.org/en/institute/departments/computational-social-science) | **HTTP 403** to automated requests | Not verified. GESIS also lists vacancies under its institute pages |
| 16 | Computational Social Science @ CUHK | The Chinese University of Hong Kong | [cssl.socsc.cuhk.edu.hk](https://cssl.socsc.cuhk.edu.hk) | OK | None found on the home page |
| 17 | Computational Story Lab | University of Vermont | [compstorylab.org](http://www.compstorylab.org/) | OK | None found (`/join/` is 404) |

Reading the table: the **sites that block automated requests** (Columbia, Koç, GESIS,
IC2S2) are the same kind of obstacle jobRxiv presents, so ask before building anything
for them. The labs with a **jobs or "join" page** (4, 10, 13) are the cheapest to add.
Most of the others hire through their host university's careers system; whether that
is Workday (which the importer already reads) has not been checked for each.

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

Ranked by effort, using what was found above:

1. **Labs that already post openings in a feed or on a simple page.**
   - *CSS Lab, University of Toronto:* positions appear as blog posts and the site advertises a feed. Try the existing `rss-generic` adapter with `config.institution = "University of Toronto"`.
   - *Human Nature Lab* (Open Positions page) and *CSSI at UMass Amherst* (Join Us page): static pages with no feed. These need a small HTML adapter, which is the first of its kind in the importer.
2. **Host universities' careers systems.** Most labs above hire through one. If a university's careers site runs on Workday, adding it is **one row** in `job_sources` (see [INGESTION.md > Adding a source](INGESTION.md#adding-a-source)). Check each before assuming: Northeastern, Yale, Stanford, USC, Columbia, Penn, Toronto and UMass Amherst have not been checked.
3. **Microsoft Research careers.** A large corporate careers site with its own search; read its terms before building anything.
4. **Sites that block automated requests** (Columbia, Koç, GESIS, IC2S2, and jobRxiv from Supabase's servers). Ask first. The importer identifies itself as `CSSJobsBot` with a contact address and does not try to get around a block. The same ask works for all of them: allow the bot to read the public pages once a day.
5. **Announcing the board.** varyCSS, the SICSS location hosts and the conference lists above are where to tell people the board exists.

**Before adding any source:** check its terms and `robots.txt`, keep the request rate low,
keep the `CSSJobsBot` user agent, and remember that every imported job still waits for an
admin to approve it.

