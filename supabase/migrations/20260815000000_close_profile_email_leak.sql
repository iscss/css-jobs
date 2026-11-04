-- Anonymous visitors could read every user profile, emails included.
--
-- The policy "Public can view basic profile info" was USING (true), and RLS
-- cannot hide individual columns, so the public API returned every row with its
-- email, name, institution, ORCID and is_admin flag to anyone holding the
-- public key. It was added so the sign-up form could ask "is this email already
-- registered?" without being signed in.
--
-- Drop it. A user still reads their own profile, an admin reads all, and the
-- remaining policies are untouched. The sign-up check moves to a function that
-- answers only yes or no for the one address asked about.

DROP POLICY IF EXISTS "Public can view basic profile info" ON public.user_profiles;

CREATE OR REPLACE FUNCTION public.email_is_registered(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE lower(email) = lower(btrim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.email_is_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_is_registered(text) TO anon, authenticated;
