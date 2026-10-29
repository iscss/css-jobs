-- Rejected-job retention and a scheduled link check
--
-- 1. Rejected jobs are kept for 30 days, then deleted. The clock starts when a
--    job becomes rejected (rejected_at), not when it was imported.
-- 2. The link check now runs on a schedule, so published, pending and rejected
--    jobs are all re-verified without anyone calling the function by hand.

-- ---------------------------------------------------------------------------
-- 1. rejected_at
-- ---------------------------------------------------------------------------

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_rejected_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.approval_status = 'rejected' THEN
    IF TG_OP = 'INSERT' OR OLD.approval_status IS DISTINCT FROM 'rejected' THEN
      NEW.rejected_at := now();
    END IF;
  ELSE
    -- Moved out of rejected (for example, an admin approved it after all).
    NEW.rejected_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_rejected_at ON public.jobs;
CREATE TRIGGER trg_set_rejected_at
  BEFORE INSERT OR UPDATE OF approval_status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_rejected_at();

-- Jobs that are already rejected start their 30 days now. Using the old
-- updated_at instead could delete them on the next run.
UPDATE public.jobs
SET rejected_at = now()
WHERE approval_status = 'rejected' AND rejected_at IS NULL;

-- Retention scan for the purge below.
CREATE INDEX IF NOT EXISTS idx_jobs_rejected_at
  ON public.jobs (rejected_at)
  WHERE approval_status = 'rejected';

-- ---------------------------------------------------------------------------
-- 2. Purge: add the 30-day rule
-- ---------------------------------------------------------------------------
--
-- Deleted nightly:
--   - any job whose application_deadline has passed
--   - a job hidden as dead or closed more than 3 days ago
--   - an AUTO-IMPORTED job that has been rejected for more than 30 days.
--     Jobs a person posted and an admin rejected are not touched: the poster
--     may still want the record.

CREATE OR REPLACE FUNCTION public.purge_expired_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  DELETE FROM public.jobs
  WHERE (application_deadline IS NOT NULL
         AND application_deadline < CURRENT_DATE)
     OR (job_status = 'filled'
         AND link_status IN ('dead', 'closed')
         AND link_checked_at < now() - interval '3 days')
     OR (approval_status = 'rejected'
         AND is_auto_imported
         AND rejected_at < now() - interval '30 days');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_jobs() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 3. Scheduled link check
-- ---------------------------------------------------------------------------
--
-- Each call checks the least recently checked jobs that are due (published
-- every 3 days, pending and rejected every 7), in a small batch. Running it
-- every two hours works through the whole table well within the recheck
-- windows, and a run with nothing due returns immediately.
--
-- Uses the same ingestion_settings as the nightly import. The check URL is
-- 'check_listings_url' if set, otherwise 'function_url' with ingest-jobs
-- replaced by check-listings.

CREATE OR REPLACE FUNCTION public.run_listing_check()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  SELECT value INTO fn_url FROM public.ingestion_settings WHERE key = 'check_listings_url';
  IF fn_url IS NULL THEN
    SELECT replace(value, '/ingest-jobs', '/check-listings') INTO fn_url
    FROM public.ingestion_settings WHERE key = 'function_url';
  END IF;
  SELECT value INTO service_key FROM public.ingestion_settings WHERE key = 'service_role_key';

  IF fn_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'link check not configured; set function_url and service_role_key';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || service_key
               ),
    body    := '{"limit": 60}'::jsonb,
    timeout_milliseconds := 300000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.run_listing_check() FROM PUBLIC;

SELECT cron.unschedule('check-listings')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-listings');

SELECT cron.schedule(
  'check-listings',
  '15 */2 * * *',
  $$ SELECT public.run_listing_check(); $$
);
