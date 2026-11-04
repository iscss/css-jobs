-- Two published jobs for local demos.
--
-- Without these the public job board shows "No jobs found", which makes the
-- "imported jobs are invisible to the public" demonstration much weaker: an
-- empty page reads as broken rather than as a working board that simply does
-- not contain the pending imports.
--
-- Local/demo use only. Never run against production.
--
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f scripts/seed-demo-jobs.sql

INSERT INTO jobs (
  title, institution, department, location, job_type,
  description, requirements, application_url, contact_email,
  is_remote, posted_by, approval_status, is_published, approved_at
)
VALUES
(
  'Assistant Professor of Computational Social Science',
  'University of Amsterdam',
  'Department of Communication Science',
  'Amsterdam, Netherlands',
  'Faculty',
  'The Department of Communication Science invites applications for a tenure-track Assistant Professor in Computational Social Science. The successful candidate will develop an independent research programme applying computational methods to questions of media, public opinion, and political communication, and will contribute to our graduate curriculum in computational methods.',
  'PhD in communication science, political science, sociology, computer science or a related field. Demonstrated experience with computational text analysis or network methods.',
  'https://www.uva.nl/en/about-the-uva/working-at-the-uva/vacancies.html',
  'vacancies@uva.example.org',
  false,
  public.job_bot_id(),
  'approved',
  true,
  now() - interval '3 days'
),
(
  'PhD Candidate in Computational Sociology',
  'ETH Zurich',
  'Chair of Social Networks',
  'Zurich, Switzerland',
  'PhD',
  'We are recruiting a doctoral researcher to join a project on the dynamics of social networks and collective behaviour. The position combines large-scale digital trace data with agent-based modelling to study how opinions form and spread in online communities. Full funding is available for four years.',
  'Masters degree in sociology, computer science, statistics or a related discipline. Strong programming skills in Python or R.',
  'https://ethz.ch/en/the-eth-zurich/working-teaching-and-research/welcome-center/job-offers.html',
  'recruiting@ethz.example.org',
  false,
  public.job_bot_id(),
  'approved',
  true,
  now() - interval '1 day'
)
ON CONFLICT DO NOTHING;

SELECT 'published jobs: ' || count(*) FROM jobs WHERE is_published;
