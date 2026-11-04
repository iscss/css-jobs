-- Organised job text: labelled sections plus pay, application link, deadline
-- and location, pulled out of the posting by the structure-jobs function.
--
-- The original description is never changed. `structured` is a derived copy
-- that the page shows when present, with a way back to the original.
--
-- Which jobs get organised: published ones (approved, published, active) that
-- have no organised copy yet. That one rule covers an admin approving a job the
-- AI rejected, hand-posted jobs and bulk approvals alike.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS structured jsonb,
  ADD COLUMN IF NOT EXISTS structured_at timestamptz,
  ADD COLUMN IF NOT EXISTS structure_failed_at timestamptz;

-- What the sweep looks for.
CREATE INDEX IF NOT EXISTS idx_jobs_awaiting_structure
  ON public.jobs (updated_at DESC)
  WHERE structured_at IS NULL AND approval_status = 'approved' AND is_published = true;

-- A changed description makes the old organised copy wrong: drop it so the next
-- sweep redoes it.
CREATE OR REPLACE FUNCTION public.reset_structured_on_description_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    NEW.structured := NULL;
    NEW.structured_at := NULL;
    NEW.structure_failed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_structured_on_description_change ON public.jobs;
CREATE TRIGGER reset_structured_on_description_change
  BEFORE UPDATE OF description ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.reset_structured_on_description_change();

-- ---------------------------------------------------------------------------
-- Scheduled sweep
-- ---------------------------------------------------------------------------
--
-- Every 15 minutes, ask structure-jobs to organise up to 20 published jobs. A
-- run with nothing to do returns at once and costs nothing. Uses the same
-- ingestion_settings as the nightly import; the address is 'structure_jobs_url'
-- if set, otherwise 'function_url' with ingest-jobs replaced by structure-jobs.

CREATE OR REPLACE FUNCTION public.run_job_structuring()
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
  SELECT value INTO fn_url FROM public.ingestion_settings WHERE key = 'structure_jobs_url';
  IF fn_url IS NULL THEN
    SELECT replace(value, '/ingest-jobs', '/structure-jobs') INTO fn_url
    FROM public.ingestion_settings WHERE key = 'function_url';
  END IF;
  SELECT value INTO service_key FROM public.ingestion_settings WHERE key = 'service_role_key';

  IF fn_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'structuring not configured; set function_url and service_role_key';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || service_key
               ),
    body    := '{"limit": 20}'::jsonb,
    timeout_milliseconds := 120000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.run_job_structuring() FROM PUBLIC;

SELECT cron.unschedule('structure-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'structure-jobs');

SELECT cron.schedule(
  'structure-jobs',
  '*/15 * * * *',
  $$ SELECT public.run_job_structuring(); $$
);

-- ---------------------------------------------------------------------------
-- "Organise now" for admins
-- ---------------------------------------------------------------------------
--
-- Clears one job's organised copy and asks the function to redo it right away,
-- instead of waiting for the next sweep. The browser cannot hold the function's
-- key, so this runs in the database and only lets admins in.

CREATE OR REPLACE FUNCTION public.structure_job_now(p_job_id uuid)
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
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can organise a job' USING ERRCODE = '42501';
  END IF;

  UPDATE public.jobs
  SET structured = NULL, structured_at = NULL, structure_failed_at = NULL
  WHERE id = p_job_id;

  SELECT value INTO fn_url FROM public.ingestion_settings WHERE key = 'structure_jobs_url';
  IF fn_url IS NULL THEN
    SELECT replace(value, '/ingest-jobs', '/structure-jobs') INTO fn_url
    FROM public.ingestion_settings WHERE key = 'function_url';
  END IF;
  SELECT value INTO service_key FROM public.ingestion_settings WHERE key = 'service_role_key';

  IF fn_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'structuring not configured; the next scheduled run will do it';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || service_key
               ),
    body    := jsonb_build_object('jobId', p_job_id),
    timeout_milliseconds := 120000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.structure_job_now(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.structure_job_now(uuid) TO authenticated;
