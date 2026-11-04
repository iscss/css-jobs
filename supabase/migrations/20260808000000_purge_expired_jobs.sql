-- Delete expired jobs
--
-- Replaces the nightly "mark as filled" step with a purge. Visibility does not
-- depend on it (the public read rule already hides a job after its deadline);
-- this removes the rows so expired postings do not pile up anywhere,
-- published or not, pending or approved.
--
-- Two kinds of job are deleted:
--   1. any job whose application_deadline has passed
--   2. a job the link check hid as dead or closed (job_status 'filled' with
--      link_status 'dead' or 'closed') more than 3 days ago. The delay is a
--      recovery window: an admin can reactivate a wrongly flagged job, which
--      puts it back to 'active' and takes it out of this rule.
--
-- Tags, saved jobs, alert matches and queued emails reference jobs with
-- ON DELETE CASCADE, so they go with the job.

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
         AND link_checked_at < now() - interval '3 days');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_jobs() FROM PUBLIC;

SELECT cron.unschedule('mark-expired-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-expired-jobs');
DROP FUNCTION IF EXISTS public.mark_expired_jobs();

SELECT cron.unschedule('purge-expired-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-jobs');

SELECT cron.schedule(
  'purge-expired-jobs',
  '5 0 * * *',
  $$ SELECT public.purge_expired_jobs(); $$
);
