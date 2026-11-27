-- Six more institutions, found by looking at what each careers site really runs on and
-- testing the importer against it on 2026-11-26/27:
--   William & Mary     Workday (existing reader)
--   Indiana University PeopleAdmin (existing reader)
--   Rutgers            PeopleAdmin (existing reader)
--   ETH Zurich         'html-jobs' (new generic reader: a list page of links, one page per job)
--   IT Univ. Copenhagen 'html-jobs' on its HR-Manager vacancy list
--   WZB Berlin         'html-jobs' on its Helix job list
--
-- Safe to run twice. Deploy the importer first or the html-jobs sources log "unknown adapter":
--   npx supabase functions deploy ingest-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez

UPDATE public.job_sources
   SET adapter = 'workday',
       feed_url = 'https://williammary.wd12.myworkdayjobs.com/wday/cxs/williammary/WM/jobs',
       is_active = true,
       config = '{"institution": "William & Mary", "status": "active", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb
 WHERE slug = 'todo-collegeofwilliamandmary';

UPDATE public.job_sources
   SET adapter = 'peopleadmin',
       feed_url = 'https://indiana.peopleadmin.com/postings/search.atom',
       is_active = true,
       config = '{"institution": "Indiana University", "status": "active", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb
 WHERE slug = 'todo-indiana';

UPDATE public.job_sources
   SET adapter = 'peopleadmin',
       feed_url = 'https://jobs.rutgers.edu/postings/search.atom',
       is_active = true,
       config = '{"institution": "Rutgers University", "status": "active", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb
 WHERE slug = 'todo-rutgers';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://jobs.ethz.ch/',
       is_active = true,
       config = '{"institution": "ETH Zurich", "status": "active", "link_pattern": "jobs\\.ethz\\.ch/job/view/", "location": "Zurich, Switzerland", "max_jobs": 40,
                  "title_filter": ["postdoc", "phd", "doctoral", "professor", "professur", "research", "scientist", "lecturer", "forschung", "wissenschaft", "data"]}'::jsonb
 WHERE slug = 'todo-ethzurich';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://candidate.hr-manager.net/Vacancies/List.aspx?customer=ituniversitetet',
       is_active = true,
       config = '{"institution": "IT University of Copenhagen", "status": "active", "link_pattern": "ApplicationInit\\.aspx\\?cid=\\d+&ProjectId=\\d+", "content_id": "AdvertisementContent", "location": "Copenhagen, Denmark", "max_jobs": 40}'::jsonb
 WHERE slug = 'hrm-itcopenhagen';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://wzb.helixjobs.com/_/joblist?lang=en_GB',
       is_active = true,
       config = '{"institution": "WZB Berlin Social Science Center", "status": "active", "link_pattern": "jobad\\?prj=", "location": "Berlin, Germany", "max_jobs": 40}'::jsonb
 WHERE slug = 'todo-wzbberlinsocialsciencecenter';

-- What was learned about institutions that could not be switched on yet. Notes only: they stay off.
UPDATE public.job_sources SET config = config || '{"note": "jobs.ox.ac.uk answers a Cloudflare challenge, and the CoreHR search at my.corehr.com/pls/uoxrecruit needs a submitted form. Needs a way to read the form results", "hiring_system": "Oxford recruitment (CoreHR)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-oxford' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "jobs.cam.ac.uk redirects to a cam.ac.uk page that has no job list in its plain HTML. Needs a reader written against the real list", "hiring_system": "Cambridge own jobs site (jobs.cam.ac.uk)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-cambridge' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "The careers page links to CoreHR. The CoreHR search needs a submitted form, so a CoreHR reader is needed (shared with Oxford and DCU)", "hiring_system": "CoreHR (my.corehr.com)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-collegedublin' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Vacancies are on CoreHR, whose search needs a submitted form, so a CoreHR reader is needed (shared with Oxford and UCD)", "hiring_system": "CoreHR (my.corehr.com/pls/dcurecruit)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-dublincity' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "The jobs page links to CoreHR. A CoreHR reader is needed (shared with Oxford, DCU and UCD)", "hiring_system": "CoreHR (linked from the jobs page)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-kingscollegelondon' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "temple.taleo.net/careersection/ex/jobsearch.ftl returns a small JavaScript shell. Needs a Taleo reader", "hiring_system": "Taleo (temple.taleo.net)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-temple' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Both princeton.edu/acad-positions and jobs.princeton.edu answer a Cloudflare challenge. Ask Princeton HR to allow CSSJobsBot", "hiring_system": "Own site behind Cloudflare", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-princeton' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "careers.northwestern.edu answers a Cloudflare challenge. Ask Northwestern HR to allow CSSJobsBot", "hiring_system": "Own site behind Cloudflare", "status": "needs-adapter"}'::jsonb WHERE slug = 'own-northwestern' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "careers.uh.edu answers an AWS bot challenge (HTTP 202) most of the time; when reachable its job pages carry standard JobPosting markup, so the generic html-jobs reader would work. Ask UH HR to allow CSSJobsBot", "hiring_system": "Own site (JobPosting markup), bot challenge", "status": "needs-adapter"}'::jsonb WHERE slug = 'own-houston' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Job pages at vacancies.lboro.ac.uk need a session and returned only a notice page to a plain request", "hiring_system": "Own site (vacancies.lboro.ac.uk)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-loughborough' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "The site lists job families (for example \"Assistant / Associate professor\"), not individual vacancies, in its plain HTML", "hiring_system": "Own site (werkenbij.uva.nl)", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-amsterdam' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "The portal answers but its vacancy list was empty or used another layout in a test; the same html-jobs reader that works for ITU needs the right list address", "hiring_system": "HR-Manager (state recruitment portal)", "status": "needs-adapter"}'::jsonb WHERE slug = 'hrm-copenhagen' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "jobs.lse.ac.uk showed only a login page to a plain request. Needs a reader and a list address", "hiring_system": "Eploy (jobs.lse.ac.uk)", "status": "needs-adapter"}'::jsonb WHERE slug = 'eploy-londoneconomics' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "bristol.ac.uk/jobs/find shows no job links in its plain HTML. Needs investigation", "hiring_system": "Eploy / own site", "status": "needs-adapter"}'::jsonb WHERE slug = 'eploy-bristol' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "werkenbij.rug.nl lists vacancies by script, with no job links in its plain HTML", "hiring_system": "Eploy / own site (werkenbij.rug.nl)", "status": "needs-adapter"}'::jsonb WHERE slug = 'eploy-groningen' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "qut.edu.au answers HTTP 403 to automated requests. Ask QUT to allow CSSJobsBot", "hiring_system": "Unknown", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-queenslandtechnology' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "jobs.illinois.edu answered HTTP 500 and illinois.edu did not load in a test. Retry from another network", "hiring_system": "Unknown", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-illinois' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "career.gatech.edu is the student career centre; the staff and faculty jobs site was not found", "hiring_system": "Unknown", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-georgia' AND is_active = false;

-- Expect 6 rows, all active:
--   SELECT slug, adapter, is_active FROM public.job_sources
--    WHERE slug IN ('todo-collegeofwilliamandmary','todo-indiana','todo-rutgers','todo-ethzurich','hrm-itcopenhagen','todo-wzbberlinsocialsciencecenter');
