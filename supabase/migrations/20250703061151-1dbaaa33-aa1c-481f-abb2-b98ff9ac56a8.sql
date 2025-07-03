
-- Add admin role to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Update RLS policies to allow admins to read all user profiles for approval management
CREATE POLICY "Admins can view all profiles for approval management" 
  ON public.user_profiles 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      auth.uid() = id OR 
      EXISTS (
        SELECT 1 FROM public.user_profiles admin_profile 
        WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = TRUE
      )
    )
  );

CREATE POLICY "Admins can update approval status" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile 
      WHERE admin_profile.id = auth.uid() AND admin_profile.is_admin = TRUE
    )
  );

-- Set yourself as admin (you'll need to replace this with your actual user ID)
-- This is a placeholder - you'll need to run this with your actual user ID after signing in
-- UPDATE public.user_profiles SET is_admin = TRUE WHERE id = 'your-user-id-here';
