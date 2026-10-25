-- Listing liveness
--
-- Records whether a job's source link still works, so dead or closed postings
-- can be taken out of the review queue and flagged on the public board.
--   live     page loads and the posting looks open
--   dead     404/410, or the site redirects to its homepage
--   closed   page loads but the posting says it has closed or expired
--   unknown  could not tell (blocked, rate limited, timeout): never acted on

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS link_status TEXT
    CHECK (link_status IN ('live', 'dead', 'closed', 'unknown')),
  ADD COLUMN IF NOT EXISTS link_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS link_status_reason TEXT;

-- Lets the checker pick the least recently checked jobs first.
CREATE INDEX IF NOT EXISTS idx_jobs_link_check
  ON public.jobs (link_checked_at NULLS FIRST)
  WHERE source_url IS NOT NULL AND approval_status IN ('pending', 'approved');
