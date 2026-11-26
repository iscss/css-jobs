-- Two more university sources, from the list of institutions suggested on 2026-11-26.
--
--   Rice University         Oracle Recruiting (the same reader as Stanford), site CX_2001.
--                           Found by reading the Oracle address out of jobs.rice.edu.
--   University of Notre Dame SmartRecruiters, which has a public Posting API. The new
--                           smartrecruiters reader needs the importer redeployed first:
--                             npx supabase functions deploy ingest-jobs --no-verify-jwt \
--                               --remote=ukkqeczgommifgecyrez
--                           (until then the nightly run logs "unknown adapter" for it
--                           and carries on with the other sources).
--
-- Both were tested on 2026-11-26 with the importer's own readers (Rice 22 postings found,
-- Notre Dame 9) before the keyword filter and the AI check. Everything still lands pending.
-- Safe to run twice.

INSERT INTO public.job_sources
  (slug, name, adapter, feed_url, config, max_age_days, is_active)
VALUES
  ('oracle-rice', 'Rice University', 'oracle-recruiting',
   'https://emdz.fa.us2.oraclecloud.com',
   '{"institution": "Rice University", "site_number": "CX_2001", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('sr-notredame', 'University of Notre Dame', 'smartrecruiters',
   'https://api.smartrecruiters.com/v1/companies/UniversityOfNotreDame/postings',
   '{"institution": "University of Notre Dame", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true)
ON CONFLICT (slug) DO NOTHING;
