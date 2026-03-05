-- Add email opt-out columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN email_opt_out BOOLEAN DEFAULT false,
  ADD COLUMN unsubscribe_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Index for fast token lookups
CREATE INDEX idx_user_profiles_unsubscribe_token ON public.user_profiles (unsubscribe_token);

-- Backfill tokens for existing users
UPDATE public.user_profiles SET unsubscribe_token = gen_random_uuid() WHERE unsubscribe_token IS NULL;

-- RLS policy: users can read their own email_opt_out
CREATE POLICY "Users can read own email_opt_out"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS policy: users can update their own email_opt_out
CREATE POLICY "Users can update own email_opt_out"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to handle unsubscribe via token (no auth required)
CREATE OR REPLACE FUNCTION public.handle_unsubscribe(token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.user_profiles
  SET email_opt_out = true
  WHERE unsubscribe_token = token;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS public.get_admin_user_profiles();

-- Update get_admin_user_profiles to return the new columns
CREATE OR REPLACE FUNCTION public.get_admin_user_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  institution text,
  orcid_id text,
  google_scholar_url text,
  website_url text,
  user_type text,
  approval_status text,
  is_admin boolean,
  is_approved_poster boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  requested_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid,
  auth_email text,
  email_confirmed_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  auth_created_at timestamp with time zone,
  email_opt_out boolean,
  unsubscribe_token uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    up.id,
    up.full_name,
    up.email,
    up.institution,
    up.orcid_id,
    up.google_scholar_url,
    up.website_url,
    up.user_type,
    up.approval_status,
    up.is_admin,
    up.is_approved_poster,
    up.created_at,
    up.updated_at,
    up.requested_at,
    up.approved_at,
    up.approved_by,
    au.email as auth_email,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at as auth_created_at,
    up.email_opt_out,
    up.unsubscribe_token
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  WHERE public.is_admin(auth.uid());
$$;
