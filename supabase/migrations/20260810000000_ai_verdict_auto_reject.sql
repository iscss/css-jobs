-- AI verdict and automatic rejection of clear non-matches.
--
-- 1. relevance_verdict stores the model's call (accept / borderline / reject).
-- 2. The insert guard on imported jobs now lets 'rejected' stand. Clear
--    non-matches are filed as rejected (kept 30 days by the purge, visible in
--    Job Management so an admin can restore one) instead of crowding the review
--    queue. Everything else is still forced to pending, and an import can never
--    be published, featured or approved on insert.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS relevance_verdict TEXT
  CHECK (relevance_verdict IN ('accept', 'borderline', 'reject'));

CREATE OR REPLACE FUNCTION public.enforce_imported_jobs_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_auto_imported THEN
    NEW.is_published := false;
    IF NEW.approval_status IS DISTINCT FROM 'rejected' THEN
      NEW.approval_status := 'pending';
    END IF;
    NEW.is_featured := false;
    NEW.imported_at := COALESCE(NEW.imported_at, now());
    NEW.submitted_for_approval_at :=
      COALESCE(NEW.submitted_for_approval_at, now());
  END IF;
  RETURN NEW;
END;
$$;
