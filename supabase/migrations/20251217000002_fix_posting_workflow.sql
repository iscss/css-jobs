-- Fix posting workflow: university verification + auto-publish after 3 jobs

-- 1. Add missing can_publish_directly column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS can_publish_directly BOOLEAN DEFAULT false;

-- 2. Revert RLS policy to require verified institution for job creation
DROP POLICY IF EXISTS "Job posters can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Approved posters can create jobs" ON public.jobs;

CREATE POLICY "Verified posters can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND user_type = 'job_poster'
        AND is_approved_poster = true  -- has verified university email
    )
  );

-- 3. Create trigger function to auto-approve users with whitelisted email domains
-- (This replaces the existing function with one that fires on the right event)
CREATE OR REPLACE FUNCTION public.check_and_approve_university_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  email_domain TEXT;
  domain_exists BOOLEAN;
BEGIN
  -- Only process job_poster users
  IF NEW.user_type != 'job_poster' THEN
    RETURN NEW;
  END IF;

  -- Extract domain from email
  IF NEW.email IS NOT NULL THEN
    email_domain := lower(split_part(NEW.email, '@', 2));

    -- Check if domain is in whitelist
    SELECT EXISTS(
      SELECT 1 FROM public.approved_domains
      WHERE lower(domain) = email_domain
    ) INTO domain_exists;

    IF domain_exists THEN
      NEW.is_approved_poster := true;
      NEW.approval_status := 'approved';
      NEW.approved_at := now();
    ELSE
      NEW.is_approved_poster := false;
      NEW.approval_status := 'rejected';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create trigger on user_profiles INSERT
DROP TRIGGER IF EXISTS check_university_email_on_signup ON public.user_profiles;
CREATE TRIGGER check_university_email_on_signup
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_approve_university_email();

-- 5. Create function to handle job approval - increment count, enable direct publish after 3
CREATE OR REPLACE FUNCTION public.handle_job_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Only trigger when job becomes approved
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- Increment the poster's approved jobs count
    UPDATE public.user_profiles
    SET
      approved_jobs_count = COALESCE(approved_jobs_count, 0) + 1,
      can_publish_directly = (COALESCE(approved_jobs_count, 0) + 1) >= 3
    WHERE id = NEW.posted_by
    RETURNING approved_jobs_count INTO new_count;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Create trigger on jobs UPDATE for approval tracking
DROP TRIGGER IF EXISTS track_job_approval ON public.jobs;
CREATE TRIGGER track_job_approval
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_approval();

-- 7. Also handle case where job is inserted already approved (by admin or direct publisher)
CREATE OR REPLACE FUNCTION public.handle_job_insert_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If job is inserted already approved, count it
  IF NEW.approval_status = 'approved' THEN
    UPDATE public.user_profiles
    SET
      approved_jobs_count = COALESCE(approved_jobs_count, 0) + 1,
      can_publish_directly = (COALESCE(approved_jobs_count, 0) + 1) >= 3
    WHERE id = NEW.posted_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_job_insert_approval ON public.jobs;
CREATE TRIGGER track_job_insert_approval
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_insert_approval();
