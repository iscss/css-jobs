-- Update the handle_new_user trigger function to properly handle user type and approval status from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_type_from_meta text;
  approval_status_val text;
  requested_at_val timestamp with time zone;
BEGIN
  -- Get user type from signup metadata
  user_type_from_meta := COALESCE(NEW.raw_user_meta_data->>'user_type', 'job_seeker');
  
  -- Set approval status and requested_at based on user type
  IF user_type_from_meta IN ('job_poster', 'both') THEN
    approval_status_val := 'pending';
    requested_at_val := now();
  ELSE
    approval_status_val := 'approved';
    requested_at_val := NULL;
  END IF;

  INSERT INTO public.user_profiles (
    id, 
    full_name, 
    email,
    user_type,
    approval_status,
    requested_at,
    google_scholar_url,
    website_url
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.email,
    user_type_from_meta,
    approval_status_val,
    requested_at_val,
    NEW.raw_user_meta_data->>'google_scholar_url',
    NEW.raw_user_meta_data->>'website_url'
  );
  
  RETURN NEW;
END;
$$;