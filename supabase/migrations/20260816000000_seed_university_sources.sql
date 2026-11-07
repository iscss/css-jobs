-- Job sources for the hosts of the CSS labs and centers listed on the Penn CSS Lab
-- community page (see docs/SOURCES.md): universities and organisations whose own
-- careers sites can carry CSS positions.
--
-- Safe to run twice: a source that already exists is left alone.
--
-- ACTIVE sources use an adapter that was tested against the live site on
-- 2026-11-07 and returned real CSS-related postings:
--   Workday ........ Penn, Northeastern, USC, Yale
--   Oracle Recruiting ... Stanford
--
-- INACTIVE sources are registered so they are visible and one switch away, but the
-- importer skips them. Each says why in config.status and config.note:
--   blocked ........ the site refuses automated requests; ask the owner to allow
--                    CSSJobsBot (the same request that applies to jobRxiv)
--   needs-adapter .. the site has no feed we can read yet; an adapter has to be written
--   unverified ..... the address did not answer from where it was checked
-- To switch one on after it is fixed:
--   UPDATE job_sources SET is_active = true WHERE slug = '<slug>';
-- (an inactive source whose adapter does not exist yet will log "unknown adapter".)

INSERT INTO public.job_sources
  (slug, name, adapter, feed_url, config, max_age_days, is_active)
VALUES
  -- ---------------------------------------------------------------- active
  ('wd-upenn', 'University of Pennsylvania', 'workday',
   'https://upenn.wd1.myworkdayjobs.com/wday/cxs/upenn/careers-at-penn/jobs',
   '{"institution": "University of Pennsylvania", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-northeastern', 'Northeastern University', 'workday',
   'https://northeastern.wd1.myworkdayjobs.com/wday/cxs/northeastern/careers/jobs',
   '{"institution": "Northeastern University", "search_terms": ["computational social science", "social data science", "computational sociology", "network science"]}'::jsonb,
   365, true),
  ('wd-usc', 'University of Southern California', 'workday',
   'https://usc.wd5.myworkdayjobs.com/wday/cxs/usc/ExternalUSCCareers/jobs',
   '{"institution": "University of Southern California", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-yale', 'Yale University', 'workday',
   'https://yale.wd1.myworkdayjobs.com/wday/cxs/yale/external_career_site/jobs',
   '{"institution": "Yale University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('oracle-stanford', 'Stanford University', 'oracle-recruiting',
   'https://careersearch.stanford.edu',
   '{"institution": "Stanford University", "site_number": "stanford", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),

  -- -------------------------------------------------------------- inactive
  ('pageup-columbia', 'Columbia University', 'pageup',
   'https://opportunities.columbia.edu/jobs/search',
   '{"institution": "Columbia University", "status": "blocked", "note": "PageUp careers site behind an AWS bot challenge: an automated request gets HTTP 202 and a JavaScript challenge page. Ask Columbia HR to allow CSSJobsBot, then write a PageUp reader."}'::jsonb,
   365, false),
  ('pageup-umass', 'University of Massachusetts Amherst', 'pageup',
   'https://careers.umass.edu/jobs/search',
   '{"institution": "University of Massachusetts Amherst", "status": "blocked", "note": "PageUp careers site behind the same AWS bot challenge as Columbia (HTTP 202 and a JavaScript challenge). Ask UMass HR to allow CSSJobsBot, then write a PageUp reader."}'::jsonb,
   365, false),
  ('harvard', 'Harvard University', 'unknown',
   'https://hr.harvard.edu/jobs',
   '{"institution": "Harvard University", "status": "blocked", "note": "The jobs page answers HTTP 403 to automated requests and the hiring platform was not identified. Computational Policy Lab (Harvard Kennedy School)."}'::jsonb,
   365, false),
  ('sf-toronto', 'University of Toronto', 'successfactors',
   'https://jobs.utoronto.ca/search/',
   '{"institution": "University of Toronto", "status": "needs-adapter", "note": "SAP SuccessFactors careers site (HTML pages). The search page ignored the query in a first test, so a reader needs to be built and checked."}'::jsonb,
   365, false),
  ('atom-uvm', 'University of Vermont', 'atom-peopleadmin',
   'https://www.uvmjobs.com/postings/search.atom',
   '{"institution": "University of Vermont", "status": "needs-adapter", "note": "PeopleAdmin publishes an Atom feed, and ?query= filters it, but entries carry only a title and department. A reader has to fetch each posting page for the description. The feed lists a No Positions Currently Open entry when a query matches nothing. Computational Story Lab."}'::jsonb,
   365, false),
  ('tugraz', 'Graz University of Technology', 'unknown',
   'https://jobs.tugraz.at/en/',
   '{"institution": "Graz University of Technology", "status": "needs-adapter", "note": "The job portal is a JavaScript app with no public data endpoint or feed found. Vacancies are also listed at tugraz.at/en/tu-graz/career/job-vacancies."}'::jsonb,
   365, false),
  ('koc', 'Koç University', 'unknown',
   'https://www.ku.edu.tr/en/about-ku/career',
   '{"institution": "Koç University", "status": "blocked", "note": "Answers HTTP 403 to automated requests. Center for Computational Social Sciences (CCSS). Ask the university to allow CSSJobsBot."}'::jsonb,
   365, false),
  ('gesis', 'GESIS Leibniz Institute for the Social Sciences', 'unknown',
   'https://www.gesis.org/en/institute/about-us',
   '{"institution": "GESIS Leibniz Institute for the Social Sciences", "status": "blocked", "note": "Answers HTTP 403 to automated requests, so the vacancies page could not be examined. Ask GESIS to allow CSSJobsBot."}'::jsonb,
   365, false),
  ('cuhk', 'The Chinese University of Hong Kong', 'unknown',
   'https://www.per.cuhk.edu.hk/',
   '{"institution": "The Chinese University of Hong Kong", "status": "unverified", "note": "The Personnel Office address did not resolve from the network it was checked on. Check it from another network, then identify the platform."}'::jsonb,
   365, false),
  ('microsoft-research', 'Microsoft Research', 'eightfold',
   'https://careers.microsoft.com/v2/global/en/home.html',
   '{"institution": "Microsoft", "status": "blocked", "note": "Microsoft careers run on Eightfold; its search API answered HTTP 429 (rate limited) to an automated request. Read its terms before building a reader."}'::jsonb,
   365, false)
ON CONFLICT (slug) DO NOTHING;
