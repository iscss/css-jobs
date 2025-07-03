
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles for approval management" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update approval status" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin access for approvals" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profile visibility" ON public.user_profiles;
DROP POLICY IF EXISTS "Users manage own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.user_profiles 
  WHERE id = user_id;
$$;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles 
  FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON public.user_profiles 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- Allow public read access for basic profile info (needed for job postings, etc.)
CREATE POLICY "Public can view basic profile info" 
  ON public.user_profiles 
  FOR SELECT 
  USING (true);
