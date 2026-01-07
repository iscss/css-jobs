-- Change non-university emails to 'pending' instead of 'rejected'
-- This allows admins to manually approve them

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
      -- University email: auto-approve
      NEW.is_approved_poster := true;
      NEW.approval_status := 'approved';
      NEW.approved_at := now();
    ELSE
      -- Non-university email: pending manual approval
      NEW.is_approved_poster := false;
      NEW.approval_status := 'pending';
      NEW.requested_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
