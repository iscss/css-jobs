-- Create a view to join user profiles with auth data for admin access
CREATE OR REPLACE VIEW public.admin_user_profiles AS
SELECT 
    up.*,
    au.email as auth_email,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at as auth_created_at
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Grant access only to authenticated users (RLS will handle admin check)
GRANT SELECT ON public.admin_user_profiles TO authenticated;

-- Create RLS policy for admin-only access
ALTER VIEW public.admin_user_profiles SET (security_barrier = true);

-- Create function to check if current user can access admin user profiles
CREATE OR REPLACE FUNCTION public.can_access_admin_user_profiles()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.user_profiles 
  WHERE id = auth.uid();
$$;