-- Deleting an account failed whenever that account had approved someone.
--
-- user_profiles.approved_by, jobs.approved_by_admin and poster_applications.reviewed_by
-- point at the admin who decided, with no delete rule, so Postgres refused to delete the
-- admin ("violates foreign key constraint user_profiles_approved_by_fkey"). The record of
-- WHO approved is not worth blocking a deletion, so these now clear themselves when that
-- account is deleted. The approvals themselves, and the people and jobs they refer to, stay.
--
-- Safe to run twice. A constraint that does not exist is skipped.

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_approved_by_fkey;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_approved_by_admin_fkey;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_approved_by_admin_fkey
  FOREIGN KEY (approved_by_admin) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.poster_applications
  DROP CONSTRAINT IF EXISTS poster_applications_reviewed_by_fkey;
ALTER TABLE public.poster_applications
  ADD CONSTRAINT poster_applications_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
