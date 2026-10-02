-- Posting freshness
--
-- Feeds differ wildly in how long they keep entries: jobRxiv expires within
-- days, CoMSES still lists postings from 2021. Storing the source's own
-- posting date lets the queue show age and lets ingestion drop listings that
-- have clearly closed.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS posted_at DATE;

COMMENT ON COLUMN public.jobs.posted_at IS
  'Date the source published the listing. NULL when the feed provides none.';

-- Admin queue sorts by relevance but filters by freshness.
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at
  ON public.jobs (posted_at DESC NULLS LAST)
  WHERE is_auto_imported = true;

-- Per-source freshness window, in days. NULL means "no age limit" (used for
-- sources that expire their own entries). Set on job_sources so tuning a
-- source needs no deploy.
ALTER TABLE public.job_sources
  ADD COLUMN IF NOT EXISTS max_age_days INTEGER
  CHECK (max_age_days IS NULL OR max_age_days > 0);

COMMENT ON COLUMN public.job_sources.max_age_days IS
  'Drop listings older than this many days at ingest. NULL disables the check.';

ALTER TABLE public.scrape_runs
  ADD COLUMN IF NOT EXISTS stale_count INTEGER NOT NULL DEFAULT 0;
