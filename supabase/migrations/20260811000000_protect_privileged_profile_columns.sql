-- Stop signed-in users from granting themselves privileges.
--
-- The "Users can update own profile" policy is FOR ALL with no column limit, so
-- any signed-in user could call the API and set is_admin, is_approved_poster or
-- can_publish_directly on their own row (or delete the row and insert a new one
-- with those set). This trigger closes that without touching the policy.
--
-- It only acts when the statement comes straight from a browser session (the
-- database role is authenticated or anon) and the person is not an admin. It
-- does nothing for:
--   - admins, who grant and revoke these in User Management;
--   - the sign-up trigger and the SECURITY DEFINER functions (approve a job,
--     auto-approve by domain, increment the approved count), which run as the
--     function owner;
--   - the service role and the SQL editor.
--
-- For everyone else the protected columns are quietly put back to their old
-- values (or to safe defaults on insert) rather than raising an error, so
-- profile forms that send a whole row keep working.

CREATE OR REPLACE FUNCTION public.protect_privileged_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_approved_poster := false;
    NEW.can_publish_directly := false;
    NEW.approved_jobs_count := 0;
  ELSE
    NEW.is_admin := OLD.is_admin;
    NEW.is_approved_poster := OLD.is_approved_poster;
    NEW.can_publish_directly := OLD.can_publish_directly;
    NEW.approved_jobs_count := OLD.approved_jobs_count;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_columns ON public.user_profiles;
CREATE TRIGGER protect_privileged_profile_columns
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_columns();
