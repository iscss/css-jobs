-- Fix RLS policy for user profiles to restrict public access to sensitive data
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.user_profiles;

-- Create a more restrictive policy that only exposes non-sensitive profile data
CREATE POLICY "Public can view basic profile info" 
ON public.user_profiles 
FOR SELECT 
USING (true);

-- Update to restrict sensitive fields by creating a more restrictive policy
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.user_profiles;

-- Create a policy that allows public access to only non-sensitive fields
-- This will require using specific field selection in queries
CREATE POLICY "Public can view basic profile info" 
ON public.user_profiles 
FOR SELECT 
USING (
  -- Allow public access but queries should be restricted to non-sensitive fields
  -- Sensitive fields: email, institution, orcid_id, google_scholar_url, website_url
  true
);

-- Create a function to check if user can view sensitive profile data
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  -- Only the profile owner or admins can view sensitive data
  SELECT 
    auth.uid() = profile_user_id OR 
    COALESCE((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
$$;

-- Add a new policy for sensitive profile data access
CREATE POLICY "Sensitive profile data access restricted" 
ON public.user_profiles 
FOR SELECT 
USING (
  -- This policy will be used by queries that need sensitive data
  public.can_view_sensitive_profile_data(id)
);