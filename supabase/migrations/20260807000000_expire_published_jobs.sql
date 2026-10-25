-- Published jobs expire on their own
--
-- A job's application_deadline is the last day it can be applied for. The
-- public read rule now also requires that date to be today or later (or unset),
-- so a job disappears from the public site the moment its deadline passes,
-- with no scheduled check or polling involved. Owners and admins still see
-- expired jobs through their own policies.
--
-- Dates are compared in the database's time zone (UTC), so a deadline of
-- 2026-11-15 stays visible through the end of 15 November UTC.

DROP POLICY IF EXISTS "Anyone can view published jobs" ON public.jobs;
CREATE POLICY "Anyone can view published jobs" ON public.jobs
  FOR SELECT USING (
    is_published = true
    AND approval_status = 'approved'
    AND (application_deadline IS NULL OR application_deadline >= CURRENT_DATE)
  );

-- Housekeeping: mark expired published jobs as filled so the admin Job
-- Management tab shows them as closed. Visibility does not depend on this.
CREATE OR REPLACE FUNCTION public.mark_expired_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.jobs
  SET job_status = 'filled', status_updated_at = now()
  WHERE approval_status = 'approved'
    AND job_status = 'active'
    AND application_deadline IS NOT NULL
    AND application_deadline < CURRENT_DATE;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_expired_jobs() FROM PUBLIC;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('mark-expired-jobs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-expired-jobs');

SELECT cron.schedule(
  'mark-expired-jobs',
  '5 0 * * *',
  $$ SELECT public.mark_expired_jobs(); $$
);
