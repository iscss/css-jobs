-- The nightly import now asks for each source in its own request.
--
-- Before: run_job_ingestion() sent ONE request with an empty body, and the importer
-- looped over every active source one after another inside that single call. Edge
-- functions have a time limit, so once there were 15 sources the call was cut off
-- partway and the sources at the end of the list (the university sources added on
-- 2026-11-07) were skipped on most nights. scrape_runs showed 7 to 10 sources run a
-- night instead of 15.
--
-- Now: one request per active source ({"source": "<slug>"}). Each runs in its own
-- function call with its own time limit, so one slow or failing source cannot stop
-- another. Same schedule (03:00 UTC), same safety (everything still lands pending).
--
-- The function still returns a single bigint (here, how many requests it queued).
-- Safe to run twice.

CREATE OR REPLACE FUNCTION public.run_job_ingestion()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url TEXT;
  service_key TEXT;
  src RECORD;
  queued BIGINT := 0;
BEGIN
  SELECT value INTO fn_url FROM public.ingestion_settings WHERE key = 'function_url';
  SELECT value INTO service_key FROM public.ingestion_settings WHERE key = 'service_role_key';

  IF fn_url IS NULL OR service_key IS NULL THEN
    RAISE NOTICE 'ingestion not configured; set function_url and service_role_key';
    RETURN NULL;
  END IF;

  FOR src IN
    SELECT slug FROM public.job_sources WHERE is_active ORDER BY slug
  LOOP
    PERFORM net.http_post(
      url     := fn_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || service_key
                 ),
      body    := jsonb_build_object('source', src.slug),
      timeout_milliseconds := 600000
    );
    queued := queued + 1;
  END LOOP;

  RETURN queued;
END;
$$;

REVOKE ALL ON FUNCTION public.run_job_ingestion() FROM PUBLIC;
