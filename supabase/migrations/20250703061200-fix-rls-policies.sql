
-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles for approval management" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update approval status" ON public.user_profiles;

-- Create new policies that don't cause recursion
-- This policy allows users to view their own profile and allows a simple admin check
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Separate policy for admin access that doesn't recurse
CREATE POLICY "Admin access for approvals" 
  ON public.user_profiles 
  FOR ALL
  USING (
    auth.uid() = id OR 
    (auth.uid() IS NOT NULL AND 
     EXISTS (
       SELECT 1 FROM public.user_profiles p 
       WHERE p.id = auth.uid() AND p.is_admin = true
     )
    )
  );

-- Make sure the existing policies work correctly
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Recreate clean policies
CREATE POLICY "Public profile visibility" 
  ON public.user_profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users manage own profile" 
  ON public.user_profiles 
  FOR ALL
  USING (auth.uid() = id);
