-- Job poster access is automatic; admin access is requested and then granted.
--
-- Before: a new account waited for an admin to approve it as a poster (university
-- email addresses were approved automatically, everyone else sat in a queue), and the
-- admin had to switch posting on account by account.
--
-- Now:
--   1. Every new account is an approved poster from the moment it is created. A job
--      still goes to an admin for approval until the poster has 3 approved jobs, so
--      this opens the form, not the public board. "Revoke Poster" in User Management
--      stays: it sets approval_status to 'rejected', which nothing here undoes.
--   2. A poster can ask for admin access (admin_requested_at). Admins see the request
--      in Pending Approvals and grant or dismiss it.
--   3. Existing accounts are brought in line (see the end of this file).
--
-- Safe to run twice. Does not touch handle_new_user(), the sign-up trigger.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS admin_requested_at timestamptz;

COMMENT ON COLUMN public.user_profiles.admin_requested_at IS
  'When the user asked for admin access. NULL when they have not asked, or an admin has decided. Admin access itself is is_admin.';

-- 1. New accounts are approved posters.
--
-- A separate BEFORE INSERT trigger, so the sign-up trigger is left exactly as it is.
-- It sorts after protect_privileged_profile_columns, so it has the last word.
CREATE OR REPLACE FUNCTION public.grant_poster_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.user_type := 'job_poster';
  NEW.is_approved_poster := true;
  NEW.approval_status := 'approved';
  NEW.approved_at := COALESCE(NEW.approved_at, now());
  NEW.requested_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_poster_on_signup ON public.user_profiles;
CREATE TRIGGER trg_poster_on_signup
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_poster_on_signup();

-- 2. Existing accounts.
--
-- Everyone who is not an approved poster becomes one, except accounts an admin
-- explicitly rejected. NOTE: an account whose posting was switched off with the old
-- "Revoke Poster" button looks the same as one that never had it (the old button did
-- not record a rejection), so it is switched back on here. To see them first:
--   SELECT email, user_type, approval_status FROM user_profiles
--   WHERE is_approved_poster IS NOT TRUE AND approval_status IS DISTINCT FROM 'rejected';
-- and revoke again afterwards in User Management if any should stay off.
UPDATE public.user_profiles
   SET is_approved_poster = true,
       user_type = 'job_poster',
       approval_status = 'approved',
       approved_at = COALESCE(approved_at, now())
 WHERE is_approved_poster IS NOT TRUE
   AND approval_status IS DISTINCT FROM 'rejected';

-- An admin or poster can still carry the "pending" status from sign-up, because
-- granting a role never changed it. That showed "Pending Approval" on an admin.
UPDATE public.user_profiles
   SET approval_status = 'approved',
       approved_at = COALESCE(approved_at, now())
 WHERE approval_status = 'pending'
   AND (is_admin IS TRUE OR is_approved_poster IS TRUE);
