-- Six more institutions switched on, after trying every one of the remaining 28 again on
-- 2026-11-27. Tested against the live sites with the importer's own readers (and, for the PDF
-- reader, in the importer's own Deno runtime): every source returned jobs and every job address
-- passed the link check while a made-up address on the same site was reported removed.
--
--   University of Mannheim          'pdf-jobs'  Stellenanzeigen page, one PDF per job (13 notices)
--   European Univ. Viadrina         'pdf-jobs'  Stellenangebote page, PDF notices (2)
--   European University Institute   'pdf-jobs'  open academic competitions, PDF notices (1)
--   Bocconi University              'bocconi'   jobmarket.unibocconi.eu list rows (38 calls; most past their deadline)
--   University of Michigan          'html-jobs' careers.umich.edu keyword searches: PARTIAL (staff and research
--                                               posts; faculty searches run on Interfolio and are not read)
--   Northwestern University         'html-jobs' postdoc announcements page: PARTIAL (postdocs only)
--
-- George Washington's feed address is now known (www.gwu.jobs/postings/search.atom) but its
-- robots.txt disallows every automated reader except a few search engines, so it stays off.
--
-- Safe to run twice. Deploy the importer and link checker first: these sources use readers added
-- in this change ('pdf-jobs' with the unpdf library, 'bocconi') and the link check has new rules
-- for PDFs, Bocconi and iCIMS-style addresses:
--   npx supabase functions deploy ingest-jobs check-listings --no-verify-jwt --remote=ukkqeczgommifgecyrez

UPDATE public.job_sources
   SET adapter = 'pdf-jobs',
       feed_url = 'https://www.uni-mannheim.de/universitaet/arbeiten-an-der-universitaet/stellenanzeigen/',
       is_active = true,
       config = '{"institution": "University of Mannheim", "status": "active", "location": "Mannheim, Germany", "link_pattern": "/media/.*\\.pdf", "exclude_pattern": "Initiativbewerbung", "max_jobs": 30, "delay_ms": 500}'::jsonb
 WHERE slug = 'todo-mannheim';

UPDATE public.job_sources
   SET adapter = 'pdf-jobs',
       feed_url = 'https://www.europa-uni.de/de/universitaet/arbeitgeberin/stellenangebote/',
       is_active = true,
       config = '{"institution": "European University Viadrina", "status": "active", "location": "Frankfurt (Oder), Germany", "link_pattern": "/_dateien/aus?s?chreibung[^/]*\\.pdf", "title_pattern": "(?:Stelle|Position) als (.{5,120}?) (?:Kenn-Nummer|\\(bis)", "max_jobs": 30, "delay_ms": 500}'::jsonb
 WHERE slug = 'todo-europeanviadrina';

UPDATE public.job_sources
   SET adapter = 'pdf-jobs',
       feed_url = 'https://eui.eu/About/JobOpportunities/Open-competitions-for-academic-posts',
       is_active = true,
       config = '{"institution": "European University Institute", "status": "active", "location": "Florence, Italy", "link_pattern": "/JobOpportunities/\\d{4}/[^/]*\\.pdf", "exclude_pattern": "Info\\.pdf", "title_pattern": "(?:to fill the|to fill a|to fill) (.{5,100}?)(?: The | at the | in the Department)", "max_jobs": 30, "delay_ms": 500}'::jsonb
 WHERE slug = 'todo-europeaninstitute';

UPDATE public.job_sources
   SET adapter = 'bocconi',
       feed_url = 'https://jobmarket.unibocconi.eu/',
       is_active = true,
       config = '{"institution": "Bocconi University", "status": "active", "max_jobs": 60, "note": "Each call is a row on the job market list; the full call is a PDF under /include/, which robots.txt disallows, so only the row (role, department, field, deadline) is read."}'::jsonb
 WHERE slug = 'own-bocconi';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://careers.umich.edu/search-jobs?keyword=postdoctoral',
       is_active = true,
       config = '{"institution": "University of Michigan", "status": "active", "location": "Ann Arbor, Michigan, USA", "link_pattern": "/job_detail/\\d+", "extra_list_urls": ["https://careers.umich.edu/search-jobs?keyword=computational", "https://careers.umich.edu/search-jobs?keyword=data+scientist", "https://careers.umich.edu/search-jobs?keyword=social+science", "https://careers.umich.edu/search-jobs?keyword=research+scientist", "https://careers.umich.edu/search-jobs?keyword=assistant+professor", "https://careers.umich.edu/search-jobs?keyword=lecturer"], "max_jobs": 40, "max_pages": 40, "delay_ms": 500, "note": "Partial: staff and research posts from careers.umich.edu keyword searches. Faculty searches run on Interfolio, which has no public feed, and are not read."}'::jsonb
 WHERE slug = 'ifo-michigan';

UPDATE public.job_sources
   SET adapter = 'html-jobs',
       feed_url = 'https://postdocs.northwestern.edu/announcements/positions-at-northwestern/',
       is_active = true,
       config = '{"institution": "Northwestern University", "status": "active", "location": "Evanston / Chicago, Illinois, USA", "link_pattern": "/positions-at-northwestern/2026/[^/]+\\.html$", "max_jobs": 15, "delay_ms": 400, "note": "Partial: the Office of Postdoctoral Affairs announcements page (newest 15 postings of the year). Faculty and staff jobs are on a PeopleSoft site that needs a session and is not read."}'::jsonb
 WHERE slug = 'own-northwestern';

-- Notes on the ones still off.
UPDATE public.job_sources
   SET feed_url = 'https://www.gwu.jobs/postings/search.atom',
       config = config || '{"status": "blocked", "note": "The PeopleAdmin feed is at www.gwu.jobs/postings/search.atom (found 2026-11-27), but robots.txt there disallows every automated reader except a few search engines, so it is not read. Ask GWU HR to allow CSSJobsBot."}'::jsonb
 WHERE slug = 'pa-georgewashington';

UPDATE public.job_sources
   SET config = config || '{"note": "princeton.edu, jobs.princeton.edu and puwebp.princeton.edu/AcadHire all answer HTTP 403 to automated requests. Ask Princeton HR to allow CSSJobsBot.", "status": "blocked"}'::jsonb
 WHERE slug = 'todo-princeton';

UPDATE public.job_sources
   SET config = config || '{"note": "qut.edu.au answers HTTP 403 to automated requests. Ask QUT to allow CSSJobsBot.", "status": "blocked"}'::jsonb
 WHERE slug = 'todo-queenslandtechnology';

UPDATE public.job_sources
   SET config = config || '{"note": "jobs.jhu.edu answers HTTP 403 to automated requests, and Interfolio (faculty) has no public feed and denies automated access. Ask JHU for an allowed route."}'::jsonb
 WHERE slug = 'ifo-johnshopkins';

UPDATE public.job_sources
   SET config = config || '{"note": "NYU''s jobs are on iCIMS (careers-nyu.icims.com). Its list and sitemap are readable, but a job page carries no job text without running scripts (the structured data says UNAVAILABLE), so nothing useful can be imported. Faculty hiring is on Interfolio (no public feed). Ask NYU for a feed."}'::jsonb
 WHERE slug = 'ifo-newyork';

UPDATE public.job_sources
   SET config = config || '{"note": "PageUp careers site. The sitemap and list are open (robots.txt allows them, crawl delay 5 seconds), but job pages answer the AWS bot challenge (HTTP 202) after a few requests. Ask Columbia HR to allow CSSJobsBot."}'::jsonb
 WHERE slug = 'pageup-columbia';

UPDATE public.job_sources
   SET config = config || '{"note": "PageUp careers site (152 jobs in its sitemap). The sitemap and list are open, but job pages answer the AWS bot challenge (HTTP 202) after a few requests. Ask UMass HR to allow CSSJobsBot."}'::jsonb
 WHERE slug = 'pageup-umass';

UPDATE public.job_sources
   SET config = config || '{"note": "hr.harvard.edu answers HTTP 403, and the faculty portal (academicpositions.harvard.edu) robots.txt disallows all automated access. Ask Harvard for a feed."}'::jsonb
 WHERE slug = 'harvard';

UPDATE public.job_sources
   SET config = config || '{"note": "robots.txt for google.com disallows the careers results pages (/about/careers/applications/jobs/results). Not read."}'::jsonb
 WHERE slug = 'todo-google';

UPDATE public.job_sources
   SET config = config || '{"note": "hertie-school.org/en/jobs shows its openings through a d.vinci job widget loaded by script (hertie-school.dvinci-easy.com); one or two postings at a time. Not read."}'::jsonb
 WHERE slug = 'todo-hertieschool';

UPDATE public.job_sources
   SET config = config || '{"note": "mpi-sp.org/6178/further-job-offers lists vacancies and shows none at the moment; the tenure-track call is a standing joint call for computer science. Recheck when it lists jobs."}'::jsonb
 WHERE slug = 'todo-maxplanckinstituteforsecuritya';

UPDATE public.job_sources
   SET config = config || '{"note": "No central job list on uniroma1.it; calls are scattered over department and notice pages in Italian. Not read."}'::jsonb
 WHERE slug = 'todo-sapienzarome';

UPDATE public.job_sources
   SET config = config || '{"note": "Jobs are on careers.hprod.onehcm.usg.edu (PeopleSoft), which needs a session and a submitted form. Needs a PeopleSoft reader or a feed from Georgia Tech HR."}'::jsonb
 WHERE slug = 'todo-georgia';
