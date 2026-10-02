-- Daily automated ingestion
--
-- Runs the ingest function nightly so new postings arrive without anyone
-- firing a curl command. This schedules *fetching* only: imported jobs still
-- land as pending and still require an admin to approve them. The
-- trg_imported_jobs_pending trigger is untouched.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- The function needs the service role key to authenticate to itself. Storing
-- it in a settings table (admin-only, RLS on) keeps it out of the cron command
-- text, which is world-readable to anyone who can query cron.job.
CREATE TABLE IF NOT EXISTS public.ingestion_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingestion_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ingestion settings" ON public.ingestion_settings;
CREATE POLICY "Admins manage ingestion settings" ON public.ingestion_settings
  FOR ALL USING (public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingestion_settings
  TO service_role, authenticated;

-- Fire the ingest endpoint. SECURITY DEFINER so the cron owner can read the
-- key without granting every caller access to it.
CREATE OR REPLACE FUNCTION public.run_job_ingestion()
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
  SELECT value INTO fn_url FROM public.ingestion_settings WHERE key = 'function_url';
  SELECT value INTO service_key FROM public.ingestion_settings WHERE key = 'service_role_key';

  IF fn_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'ingestion not configured; set function_url and service_role_key';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || service_key
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 600000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.run_job_ingestion() FROM PUBLIC;

-- 03:00 UTC daily. Academic postings stay open for weeks, so once a day is
-- ample and keeps request volume light on the sites being read.
SELECT cron.unschedule('ingest-jobs-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-jobs-daily');

SELECT cron.schedule(
  'ingest-jobs-daily',
  '0 3 * * *',
  $$ SELECT public.run_job_ingestion(); $$
);
