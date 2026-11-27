-- More institutions, found by (1) reading each site's sitemap instead of its script-built list,
-- (2) searching within each institution's own domain for its real job portal, and
-- (3) reading jobs.ac.uk, which carries the UK universities on Alex's list.
-- Tested against the live sites on 2026-11-27.
--
--   University of Houston            sitemap + JobPosting markup; its robots.txt asks for a 5 second
--                                    delay, so it reads 15 jobs a night. Its bot challenge (HTTP 202)
--                                    often blocks pages, so expect few jobs and some quiet nights
--   University of Colorado Boulder   its paged job list (25 jobs a night: 40 took over a minute)
--   University of Konstanz           stellen.uni-konstanz.de sitemap
--   Max Planck Inst. Human Dev.      careers.mpib-berlin.mpg.de list
--   jobs.ac.uk (new source 'jobsacuk')  Oxford, Cambridge, King's College London, LSE, Bristol and
--                                    Loughborough: the sitemap's jobs are opened (subject words first)
--                                    and kept only when the employer is one of those six
--
-- Safe to run twice. Deploy the importer first or these sources log "unknown adapter" (they use the
-- 'html-jobs' reader added in 20260825000000):
--   npx supabase functions deploy ingest-jobs check-listings --no-verify-jwt --remote=ukkqeczgommifgecyrez

INSERT INTO public.job_sources (slug, name, adapter, feed_url, config, max_age_days, is_active)
VALUES (
  'jobsacuk', 'UK universities on jobs.ac.uk (Oxford, Cambridge, King''s, LSE, Bristol, Loughborough)', 'html-jobs',
  'https://www.jobs.ac.uk/sitemap.xml',
  '{"institution": "UK universities (jobs.ac.uk)", "status": "active", "link_pattern": "/job/", "priority_terms": ["computational", "social science", "data science", "politic", "sociolog", "network analysis", "machine learning", "artificial intelligence", "digital", "statistic", "quantitative", "behaviour", "communication", "economics", "postdoc", "research fellow", "research associate"], "employers": ["university of oxford", "university of cambridge", "king''s college london", "london school of economics", "university of bristol", "loughborough"], "max_pages": 140, "max_jobs": 60, "location": "United Kingdom", "delay_ms": 150}'::jsonb,
  365, true
)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://careers.uh.edu/sitemap.xml',
       is_active = true,
       config = '{"institution": "University of Houston", "status": "active", "link_pattern": "careers\\.uh\\.edu/jobs/", "slug_terms": ["postdoc", "phd", "professor", "research", "scientist", "lecturer", "data", "faculty"], "priority_terms": ["data", "computational", "social", "research", "postdoc"], "max_pages": 15, "max_jobs": 15, "delay_ms": 5000, "location": "Houston, Texas"}'::jsonb
 WHERE slug = 'own-houston';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://jobs.colorado.edu/jobs/SearchJobs/',
       is_active = true,
       config = '{"institution": "University of Colorado Boulder", "status": "active", "link_pattern": "/jobs/JobDetail/", "title_from": "list", "extra_list_urls": ["https://jobs.colorado.edu/jobs/SearchJobs/?jobOffset=25", "https://jobs.colorado.edu/jobs/SearchJobs/?jobOffset=50", "https://jobs.colorado.edu/jobs/SearchJobs/?jobOffset=75", "https://jobs.colorado.edu/jobs/SearchJobs/?jobOffset=100"], "title_filter": ["postdoc", "professor", "research", "scientist", "lecturer", "faculty", "data", "instructor"], "max_jobs": 25, "location": "Boulder, Colorado"}'::jsonb
 WHERE slug = 'todo-coloradoboulder';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://stellen.uni-konstanz.de/sitemap.xml.gz',
       is_active = true,
       config = '{"institution": "University of Konstanz", "status": "active", "link_pattern": "stellen\\.uni-konstanz\\.de/jobposting/", "max_jobs": 40, "location": "Konstanz, Germany"}'::jsonb
 WHERE slug = 'todo-konstanz';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://careers.mpib-berlin.mpg.de/jobs',
       is_active = true,
       config = '{"institution": "Max Planck Institute for Human Development", "status": "active", "link_pattern": "careers\\.mpib-berlin\\.mpg\\.de/jobs/\\d+", "max_jobs": 40, "location": "Berlin, Germany"}'::jsonb
 WHERE slug = 'todo-maxplanckinstituteforhumandeve';

-- The six UK institutions are read through the 'jobsacuk' source above, so their own rows stay off
-- (switching them on as well would import every job twice).
UPDATE public.job_sources
   SET config = config || '{"status": "covered-by-aggregator", "note": "Read through the jobsacuk source (jobs.ac.uk), filtered to this employer. Leave this row off."}'::jsonb
 WHERE slug IN ('todo-oxford','todo-cambridge','todo-kingscollegelondon','eploy-londoneconomics','eploy-bristol','todo-loughborough')
   AND is_active = false;

-- What was learned about institutions that still cannot be read. Notes only: they stay off.
UPDATE public.job_sources SET config = config || '{"note": "Portal at jobs.uzh.ch builds its job list with script (about 127 vacancies) and has no sitemap; needs its data address found with a browser", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-zurich' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Portal at jobs.unisg.ch builds its list with script and has no sitemap; job pages are /offene-stellen/<title>/<id>. Needs its data address found with a browser", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-stgallen' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Central list at uni-bremen.de/universitaet/die-uni-als-arbeitgeber/offene-stellen shows no job links in plain HTML (jobs are /job/<id> pages); needs its data address found", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-bremen' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Central list at uni-mannheim.de/universitaet/arbeiten-an-der-universitaet/stellenanzeigen shows no job links in plain HTML; needs its data address found", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-mannheim' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Staff and faculty postings are on sujobopps.com, which did not answer a plain request; needs a retry from another network", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-syracuse' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Job search at hr.mit.edu/jobs/search shows no job links in plain HTML; needs its data address found", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-massachusetts' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "Open posts at eui.eu/About/JobOpportunities/Open-competitions-for-academic-posts are PDF notices; needs a PDF reader", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-europeaninstitute' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "No central job portal found; calls are scattered over department pages", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-sapienzarome' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "The career pages mostly say no open positions (calls run in cycles); low value", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-maxplanckinstituteforsecuritya' AND is_active = false;
UPDATE public.job_sources SET config = config || '{"note": "hertie-school.org/en/jobs lists one or two postings and shows them without links; low volume", "status": "needs-adapter"}'::jsonb WHERE slug = 'todo-hertieschool' AND is_active = false;

-- Expect 5 active rows:
--   SELECT slug, adapter, is_active FROM public.job_sources
--    WHERE slug IN ('jobsacuk','own-houston','todo-coloradoboulder','todo-konstanz','todo-maxplanckinstituteforhumandeve');
