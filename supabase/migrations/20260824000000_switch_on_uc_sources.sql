-- Four University of California campuses publish academic jobs on the same "AP Recruit"
-- software, which the importer can now read (adapter 'uc-recruit'). The reader takes the
-- campus's /apply page (every open recruitment in one table), opens the ones about data,
-- computing, the social sciences and research first, and reads each page. Verified live
-- on 2026-11-26: Berkeley, Davis, San Diego and UCLA each returned full descriptions,
-- dates and deadlines.
--
-- max_age_days is 730 because UC recruitments are often open for more than a year (rolling
-- lecturer pools), and each page gives a real final date.
--
-- Safe to run twice. Deploy the importer first or these sources log "unknown adapter":
--   npx supabase functions deploy ingest-jobs --no-verify-jwt --remote=ukkqeczgommifgecyrez

UPDATE public.job_sources
   SET adapter   = 'uc-recruit',
       feed_url  = 'https://aprecruit.berkeley.edu/apply',
       is_active = true,
       max_age_days = 730,
       config    = '{"institution": "UC Berkeley", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'uc-ucberkeley';

UPDATE public.job_sources
   SET adapter   = 'uc-recruit',
       feed_url  = 'https://recruit.ucdavis.edu/apply',
       is_active = true,
       max_age_days = 730,
       config    = '{"institution": "UC Davis", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'uc-ucdavis';

UPDATE public.job_sources
   SET adapter   = 'uc-recruit',
       feed_url  = 'https://apol-recruit.ucsd.edu/apply',
       is_active = true,
       max_age_days = 730,
       config    = '{"institution": "UC San Diego", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'uc-ucsandiego';

UPDATE public.job_sources
   SET adapter   = 'uc-recruit',
       feed_url  = 'https://recruit.apo.ucla.edu/apply',
       is_active = true,
       max_age_days = 730,
       config    = '{"institution": "UCLA", "status": "active", "max_jobs": 60}'::jsonb
 WHERE slug = 'uc-ucla';

-- Expect 4 rows, all active:
--   SELECT slug, adapter, is_active FROM public.job_sources WHERE adapter = 'uc-recruit' ORDER BY slug;
