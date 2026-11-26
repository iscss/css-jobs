-- Five universities run SAP SuccessFactors career sites, which the importer can now read
-- (adapter 'successfactors'). It reads each site's sitemap, keeps jobs whose title looks
-- academic or research, and opens those pages. Verified live on 2026-11-26: each site
-- returned full descriptions, locations and deadlines.
--
-- Safe to run twice. Deploy the importer first or the same night these sources log
-- "unknown adapter":
--   npx supabase functions deploy ingest-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez

UPDATE public.job_sources
   SET adapter   = 'successfactors',
       feed_url  = 'https://careers.duke.edu',
       is_active = true,
       config    = '{"institution": "Duke University", "status": "active", "max_jobs": 40}'::jsonb
 WHERE slug = 'sf-duke';

UPDATE public.job_sources
   SET adapter   = 'successfactors',
       feed_url  = 'https://careers.purdue.edu',
       is_active = true,
       config    = '{"institution": "Purdue University", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'sf-purdue';

UPDATE public.job_sources
   SET adapter   = 'successfactors',
       feed_url  = 'https://careers.tudelft.nl',
       is_active = true,
       config    = '{"institution": "Delft University of Technology", "status": "active", "max_jobs": 50}'::jsonb
 WHERE slug = 'sf-delfttechnology';

-- Vienna posts many jobs in German, so the title words include German ones.
UPDATE public.job_sources
   SET adapter   = 'successfactors',
       feed_url  = 'https://jobs.univie.ac.at',
       is_active = true,
       config    = '{"institution": "University of Vienna", "status": "active", "max_jobs": 60,
                     "search_terms": ["postdoc", "post-doc", "postdoctoral", "phd", "doctoral",
                       "professor", "professur", "tenure", "lecturer", "researcher",
                       "research associate", "research fellow", "university assistant",
                       "universitätsassistent", "praedoc", "dissertant", "data scientist",
                       "computational"]}'::jsonb
 WHERE slug = 'sf-vienna';

UPDATE public.job_sources
   SET adapter   = 'successfactors',
       feed_url  = 'https://jobs.utoronto.ca',
       is_active = true,
       config    = '{"institution": "University of Toronto", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'sf-toronto';

-- Expect 5 rows, all active:
--   SELECT slug, adapter, is_active FROM public.job_sources WHERE adapter = 'successfactors' ORDER BY slug;
