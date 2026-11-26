-- More university job sources, from the list of institutions suggested on 2026-11-26.
--
-- Each is a university careers site on Workday, found by reading the tenant's
-- robots.txt (which lists its careers sites) and then tested with the importer's own
-- Workday reader on 2026-11-26: every one answered and returned postings for the
-- search terms. The importer's keyword filter and the AI check then decide what is
-- relevant, as for every other source. Everything still lands as pending.
--
-- Where a university has several careers sites, the one most likely to carry research
-- and faculty roles was chosen:
--   BYU faculty-careers, Georgetown Georgetown_Faculty, Penn State PSU_Academic,
--   UT Austin UTstaff (UT Austin faculty are hired through Interfolio, not Workday),
--   Rochester UR_Staff.
-- To add another careers site of the same university, add another row with a new slug.
--
-- Safe to run twice: a source that already exists is left alone.
-- Pause one with: UPDATE job_sources SET is_active = false WHERE slug = '...';

INSERT INTO public.job_sources
  (slug, name, adapter, feed_url, config, max_age_days, is_active)
VALUES
  ('wd-american', 'American University', 'workday',
   'https://american.wd1.myworkdayjobs.com/wday/cxs/american/AU/jobs',
   '{"institution": "American University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-byu', 'Brigham Young University', 'workday',
   'https://byu.wd1.myworkdayjobs.com/wday/cxs/byu/faculty-careers/jobs',
   '{"institution": "Brigham Young University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-clemson', 'Clemson University', 'workday',
   'https://clemson.wd12.myworkdayjobs.com/wday/cxs/clemson/Clemson_Careers/jobs',
   '{"institution": "Clemson University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-dartmouth', 'Dartmouth College', 'workday',
   'https://dart.wd1.myworkdayjobs.com/wday/cxs/dart/DART/jobs',
   '{"institution": "Dartmouth College", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-georgetown', 'Georgetown University', 'workday',
   'https://georgetown.wd1.myworkdayjobs.com/wday/cxs/georgetown/Georgetown_Faculty/jobs',
   '{"institution": "Georgetown University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-pennstate', 'Pennsylvania State University', 'workday',
   'https://psu.wd1.myworkdayjobs.com/wday/cxs/psu/PSU_Academic/jobs',
   '{"institution": "Pennsylvania State University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-utaustin', 'University of Texas at Austin', 'workday',
   'https://utaustin.wd1.myworkdayjobs.com/wday/cxs/utaustin/UTstaff/jobs',
   '{"institution": "University of Texas at Austin", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-wustl', 'Washington University in St. Louis', 'workday',
   'https://wustl.wd1.myworkdayjobs.com/wday/cxs/wustl/External/jobs',
   '{"institution": "Washington University in St. Louis", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-rochester', 'University of Rochester', 'workday',
   'https://rochester.wd5.myworkdayjobs.com/wday/cxs/rochester/UR_Staff/jobs',
   '{"institution": "University of Rochester", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-mcgill', 'McGill University', 'workday',
   'https://mcgill.wd3.myworkdayjobs.com/wday/cxs/mcgill/McGill_Careers/jobs',
   '{"institution": "McGill University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-sydney', 'University of Sydney', 'workday',
   'https://usyd.wd105.myworkdayjobs.com/wday/cxs/usyd/USYD_EXTERNAL_CAREER_SITE/jobs',
   '{"institution": "University of Sydney", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true),
  ('wd-melbourne', 'University of Melbourne', 'workday',
   'https://unimelb.wd105.myworkdayjobs.com/wday/cxs/unimelb/UoM_External_Career/jobs',
   '{"institution": "University of Melbourne", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb,
   365, true)
ON CONFLICT (slug) DO NOTHING;
