-- Thirteen more institutions switched on, after finding the real data addresses behind sites whose
-- job lists are built by script. Tested against the live sites on 2026-11-27: every source returned
-- jobs, and every job address passed the link check while a made-up address on the same site was
-- reported removed.
--
--   University of Zurich            'prospective'  JSON service behind jobs.uzh.ch (111 vacancies)
--   Bern University of Applied Sci. 'prospective'  same platform, career centre 1002509
--   University of St. Gallen        'html-jobs'    jobs.unisg.ch list with ?limit=100 (47 jobs)
--   University of Groningen         'html-jobs'    werkenbij.rug.nl vacancy sitemap (reads 32 a night: pages are slow)
--   University of Bremen            'html-jobs'    list page; last heading is the title, German deadline pattern
--   Heinrich Heine Univ. Duesseldorf 'html-jobs'   karriere.hhu.de sitemap (JobPosting markup)
--   University of Amsterdam         'html-jobs'    werkenbij.uva.nl/vacatures, 10 a page
--   University of Copenhagen        'html-jobs'    employment.ku.dk/all-vacancies list
--   MIT                             'html-jobs'    PeopleClick sitemap, newest 120 pages opened, 80 jobs kept
--   Temple University               'taleo'        faculty career section (22 jobs)
--   Graz University of Technology   'tugraz'       JSON service behind jobs.tugraz.at (20 jobs)
--   Boston University               'html-jobs'    Academic Jobs Online, newest 14 a night (its robots.txt asks for a 5 second delay)
--   University of Illinois          'html-jobs'    Academic Jobs Online only: PARTIAL, see the note on the row
--
-- The rest of the file records why each remaining institution is still off.
--
-- Safe to run twice. Deploy the importer and link checker first: these sources use readers added
-- in this change ('prospective', 'taleo', 'tugraz' and new options of 'html-jobs'), and the link
-- check needs the new rules for Taleo, Academic Jobs Online, Copenhagen and TU Graz:
--   npx supabase functions deploy ingest-jobs check-listings --no-verify-jwt --remote=ukkqeczgommifgecyrez

UPDATE public.job_sources
   SET adapter = 'prospective',
       feed_url = 'https://ohws.prospective.ch/public/v1/medium/1002007/jobs',
       is_active = true,
       config = '{"institution": "University of Zurich", "status": "active", "location": "Zurich, Switzerland", "max_jobs": 150}'::jsonb
 WHERE slug = 'todo-zurich';

UPDATE public.job_sources
   SET adapter = 'prospective',
       feed_url = 'https://ohws.prospective.ch/public/v1/medium/1002509/jobs',
       is_active = true,
       config = '{"institution": "Bern University of Applied Sciences", "status": "active", "location": "Bern, Switzerland", "max_jobs": 80}'::jsonb
 WHERE slug = 'todo-bernappliedsciences';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://jobs.unisg.ch/?offset=0&limit=100&lang=en',
       is_active = true,
       config = '{"institution": "University of St. Gallen", "status": "active", "link_pattern": "jobs\\.unisg\\.ch/offene-stellen/", "location": "St. Gallen, Switzerland", "max_jobs": 60, "delay_ms": 400}'::jsonb
 WHERE slug = 'todo-stgallen';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://werkenbij.rug.nl/vacature-sitemap.xml',
       is_active = true,
       config = '{"institution": "University of Groningen", "status": "active", "link_pattern": "werkenbij\\.rug\\.nl/vacature/", "location": "Groningen, Netherlands", "max_jobs": 32, "delay_ms": 150, "max_pages": 32, "priority_terms": ["social", "data", "computation", "research", "onderzoek", "postdoc", "phd", "promov", "lecturer", "professor", "hoogleraar", "docent", "assistant"]}'::jsonb
 WHERE slug = 'eploy-groningen';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://www.uni-bremen.de/universitaet/die-uni-als-arbeitgeber/offene-stellen',
       is_active = true,
       config = '{"institution": "University of Bremen", "status": "active", "link_pattern": "/offene-stellen/job/\\d+", "title_from": "last-h1", "deadline_pattern": "Bewerbungsfrist:?\\s*([0-9./]{8,10})", "location": "Bremen, Germany", "max_jobs": 50, "delay_ms": 500}'::jsonb
 WHERE slug = 'todo-bremen';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://karriere.hhu.de/sitemap.xml',
       is_active = true,
       config = '{"institution": "Heinrich Heine University Düsseldorf", "status": "active", "link_pattern": "karriere\\.hhu\\.de/index\\.php\\?ac=jobad", "location": "Düsseldorf, Germany", "max_jobs": 40, "delay_ms": 1000}'::jsonb
 WHERE slug = 'todo-heinrichheinedsseldorf';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://werkenbij.uva.nl/vacatures',
       is_active = true,
       config = '{"institution": "University of Amsterdam", "status": "active", "link_pattern": "werkenbij\\.uva\\.nl/vacatures/[a-z0-9-]+-\\d+$", "location": "Amsterdam, Netherlands", "extra_list_urls": ["https://werkenbij.uva.nl/vacatures?o=10", "https://werkenbij.uva.nl/vacatures?o=20", "https://werkenbij.uva.nl/vacatures?o=30", "https://werkenbij.uva.nl/vacatures?o=40"], "max_jobs": 50, "delay_ms": 400}'::jsonb
 WHERE slug = 'todo-amsterdam';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://employment.ku.dk/all-vacancies/',
       is_active = true,
       config = '{"institution": "University of Copenhagen", "status": "active", "link_pattern": "all-vacancies/\\?show=\\d+", "location": "Copenhagen, Denmark", "max_jobs": 40, "delay_ms": 400}'::jsonb
 WHERE slug = 'hrm-copenhagen';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://careers.peopleclick.com/careerscp/client_mit/external/sitemap.xml',
       is_active = true,
       config = '{"institution": "Massachusetts Institute of Technology", "status": "active", "link_pattern": "client_mit/external/en-us/gateway/viewFromLink\\.html\\?jobPostId=", "newest_first": true, "max_pages": 120, "max_jobs": 80, "location": "Cambridge, MA, US", "delay_ms": 200}'::jsonb
 WHERE slug = 'todo-massachusetts';

UPDATE public.job_sources
   SET adapter = 'taleo',
       feed_url = 'https://temple.taleo.net/careersection/tu_ex_faculty/jobsearch.ftl?lang=en',
       is_active = true,
       config = '{"institution": "Temple University", "status": "active", "portal": "28100025969", "location": "Philadelphia, PA, US", "max_jobs": 60}'::jsonb
 WHERE slug = 'todo-temple';

UPDATE public.job_sources
   SET adapter = 'tugraz',
       feed_url = 'https://personal.tugraz.at/api/erec/public/job-postings',
       is_active = true,
       config = '{"institution": "Graz University of Technology", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'tugraz';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://academicjobsonline.org/ajo/BU',
       is_active = true,
       config = '{"institution": "Boston University", "status": "active", "link_pattern": "/ajo/jobs/\\d+", "newest_first": true, "max_pages": 14, "max_jobs": 14, "location": "Boston, MA, US", "delay_ms": 5000}'::jsonb
 WHERE slug = 'ajo-boston';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://academicjobsonline.org/ajo/UIUC',
       is_active = true,
       config = '{"institution": "University of Illinois Urbana-Champaign", "status": "active", "link_pattern": "/ajo/jobs/\\d+", "newest_first": true, "max_pages": 14, "max_jobs": 14, "location": "Urbana, IL, US", "delay_ms": 5000, "note": "Partial: only the departments that advertise on Academic Jobs Online. The main hiring system (Cornerstone) is a script app with no public list."}'::jsonb
 WHERE slug = 'todo-illinois';

UPDATE public.job_sources
   SET config = config || '{"note": "The job list opens, but every job page and the RSS feed answer HTTP 202 (the same AWS bot challenge as Columbia and UMass Amherst), so no job can be read. Ask the University of Oregon to allow CSSJobsBot."}'::jsonb
 WHERE slug = 'pageup-oregon';

UPDATE public.job_sources
   SET config = config || '{"note": "careers.northwestern.edu is a PeopleSoft eRecruit site: its list needs a logged-in style session and a submitted form, with no public list or feed. Would need a PeopleSoft reader, or Northwestern HR to give a feed."}'::jsonb
 WHERE slug = 'own-northwestern';

UPDATE public.job_sources
   SET config = config || '{"note": "Georgia Tech jobs are on the University System of Georgia PeopleSoft careers site (careers.hprod.onehcm.usg.edu), which needs a session and a submitted form. hr.gatech.edu also asks for a 30 second crawl delay. Needs a PeopleSoft reader."}'::jsonb
 WHERE slug = 'todo-georgia';

UPDATE public.job_sources
   SET config = config || '{"note": "Open positions at uni-mannheim.de are PDF notices (about 40), each linked from the stellenanzeigen page. Reading them needs a PDF text reader, which has not been added to the importer yet."}'::jsonb
 WHERE slug = 'todo-mannheim';

UPDATE public.job_sources
   SET config = config || '{"note": "Postings are PDF notices on europa-uni.de/en/universitaet/arbeitgeberin/stellenangebote, and the application system at jobs.europa-uni.de is a script app. Needs a PDF text reader."}'::jsonb
 WHERE slug = 'todo-europeanviadrina';

UPDATE public.job_sources
   SET config = config || '{"note": "sujobopps.com (PeopleAdmin) has a robots.txt that disallows all automated access, so it is not read. Ask Syracuse HR for a feed or to allow CSSJobsBot."}'::jsonb
 WHERE slug = 'todo-syracuse';

UPDATE public.job_sources
   SET config = config || '{"note": "The CoreHR search at my.corehr.com/pls/dcurecruit answers HTTP 403 to an automated search request. Ask DCU HR to allow CSSJobsBot or give a feed."}'::jsonb
 WHERE slug = 'todo-dublincity';

UPDATE public.job_sources
   SET config = config || '{"note": "ucd.ie answers HTTP 403 to automated requests (and its jobs are on CoreHR). Ask UCD to allow CSSJobsBot."}'::jsonb
 WHERE slug = 'todo-collegedublin';

UPDATE public.job_sources
   SET config = config || '{"note": "No central careers portal found on polytechnique.edu; research posts are mostly on the CNRS job site (emploi.cnrs.fr) and lab pages. Not read."}'::jsonb
 WHERE slug = 'todo-colepolytechnique';

UPDATE public.job_sources
   SET config = config || '{"note": "csh.ac.at/engage/jobs shows no CSH postings of its own at the moment (the links on it are for IT:U Austria), and the Personio feed returned 404. Recheck when CSH has openings."}'::jsonb
 WHERE slug = 'personio-complexitysciencehubvienna';

UPDATE public.job_sources
   SET config = config || '{"note": "Interfolio has no public feed and its robots.txt denies automated access. Ask the university for an allowed route."}'::jsonb
 WHERE slug = 'ifo-johnshopkins';

UPDATE public.job_sources
   SET config = config || '{"note": "Interfolio has no public feed and its robots.txt denies automated access. Ask the university for an allowed route."}'::jsonb
 WHERE slug = 'ifo-newyork';

UPDATE public.job_sources
   SET config = config || '{"note": "Interfolio has no public feed and its robots.txt denies automated access. Ask the university for an allowed route."}'::jsonb
 WHERE slug = 'ifo-michigan';

UPDATE public.job_sources
   SET config = config || '{"note": "Microsoft careers answered HTTP 429 (rate limited) to every automated request, including with a long pause. Not read."}'::jsonb
 WHERE slug = 'microsoft-research';

-- Mark the ones the owner has to unblock, as the other blocked rows are marked.
UPDATE public.job_sources
   SET config = config || '{"status": "blocked"}'::jsonb
 WHERE slug IN ('pageup-oregon', 'own-northwestern', 'todo-syracuse', 'todo-dublincity', 'todo-collegedublin');
