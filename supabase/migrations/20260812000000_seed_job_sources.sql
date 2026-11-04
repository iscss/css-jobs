-- The job sources besides jobRxiv (which 20260803000000 creates): the CoMSES
-- Net feed and the Workday university career sites. They were added to the
-- development database by hand, so a fresh database had only jobRxiv.
--
-- Safe to run twice: a source that already exists is left alone.
--
-- Carnegie Mellon (wd-cmu) is left out on purpose. Its Workday endpoint has
-- answered HTTP 422 on every run since at least October 2026. To retry it, add a
-- row for it here once the endpoint works.

INSERT INTO public.job_sources (slug, name, adapter, feed_url, config, max_age_days)
VALUES
  ('comses', 'CoMSES Net', 'rss-comses', 'https://www.comses.net/feeds/jobs/rss/', '{}'::jsonb, 180),
  ('wd-brown', 'Brown University', 'workday', 'https://brown.wd5.myworkdayjobs.com/wday/cxs/brown/staff-careers-brown/jobs', '{"institution": "Brown University", "search_terms": ["computational social science", "social data science"]}'::jsonb, 365),
  ('wd-cornell', 'Cornell University', 'workday', 'https://cornell.wd1.myworkdayjobs.com/wday/cxs/cornell/CornellCareerPage/jobs', '{"institution": "Cornell University", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb, 365),
  ('wd-osu', 'Ohio State University', 'workday', 'https://osu.wd1.myworkdayjobs.com/wday/cxs/osu/OSUCareers/jobs', '{"institution": "Ohio State University", "search_terms": ["computational social science", "social data science"]}'::jsonb, 365),
  ('wd-uchicago', 'University of Chicago', 'workday', 'https://uchicago.wd5.myworkdayjobs.com/wday/cxs/uchicago/External/jobs', '{"institution": "University of Chicago", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb, 365),
  ('wd-umd', 'University of Maryland', 'workday', 'https://umd.wd1.myworkdayjobs.com/wday/cxs/umd/UMCP/jobs', '{"institution": "University of Maryland", "search_terms": ["computational social science", "social data science"]}'::jsonb, 365),
  ('wd-uva', 'University of Virginia', 'workday', 'https://uva.wd1.myworkdayjobs.com/wday/cxs/uva/UVAJobs/jobs', '{"institution": "University of Virginia", "search_terms": ["computational social science", "social data science"]}'::jsonb, 365),
  ('wd-uw', 'University of Washington', 'workday', 'https://uw.wd5.myworkdayjobs.com/wday/cxs/uw/UWHires/jobs', '{"institution": "University of Washington", "search_terms": ["computational social science", "social data science", "computational sociology"]}'::jsonb, 365),
  ('wd-wisconsin', 'University of Wisconsin', 'workday', 'https://wisconsin.wd1.myworkdayjobs.com/wday/cxs/wisconsin/UW_Comprehensives/jobs', '{"institution": "University of Wisconsin", "search_terms": ["computational social science", "social data science"]}'::jsonb, 365)

ON CONFLICT (slug) DO NOTHING;
