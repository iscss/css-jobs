-- Critical Security Fixes Migration

-- 1. Fix admin_user_profiles view security by adding proper RLS policies
ALTER TABLE public.admin_user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin_user_profiles view access
CREATE POLICY "Only admins can access admin user profiles view" 
ON public.admin_user_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 2. Update security definer functions with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.user_profiles 
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_access_admin_user_profiles()
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.user_profiles 
  WHERE id = auth.uid();
$$;

-- 3. Add input validation constraints
ALTER TABLE public.user_profiles 
ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.user_profiles 
ADD CONSTRAINT valid_google_scholar_url 
CHECK (google_scholar_url IS NULL OR google_scholar_url ~* '^https?://');

ALTER TABLE public.user_profiles 
ADD CONSTRAINT valid_website_url 
CHECK (website_url IS NULL OR website_url ~* '^https?://');

ALTER TABLE public.user_profiles 
ADD CONSTRAINT full_name_length 
CHECK (length(full_name) <= 100);

ALTER TABLE public.user_profiles 
ADD CONSTRAINT institution_length 
CHECK (length(institution) <= 200);

-- 4. Add constraints to jobs table for better validation
ALTER TABLE public.jobs 
ADD CONSTRAINT title_length 
CHECK (length(title) <= 200 AND length(title) >= 5);

ALTER TABLE public.jobs 
ADD CONSTRAINT institution_length_jobs 
CHECK (length(institution) <= 200 AND length(institution) >= 2);

ALTER TABLE public.jobs 
ADD CONSTRAINT description_length 
CHECK (length(description) >= 50 AND length(description) <= 10000);

ALTER TABLE public.jobs 
ADD CONSTRAINT valid_application_url 
CHECK (application_url IS NULL OR application_url ~* '^https?://');

ALTER TABLE public.jobs 
ADD CONSTRAINT valid_contact_email 
CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- 5. Create audit log table for admin actions
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  target_resource_type text,
  target_resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 6. Update other database functions with proper security
CREATE OR REPLACE FUNCTION public.job_matches_alert(job_row jobs, alert_row job_alerts)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check keywords match (case-insensitive, partial match)
  IF alert_row.keywords IS NOT NULL AND alert_row.keywords != '' THEN
    IF NOT (
      LOWER(job_row.title) LIKE '%' || LOWER(alert_row.keywords) || '%' OR
      LOWER(job_row.description) LIKE '%' || LOWER(alert_row.keywords) || '%' OR
      LOWER(COALESCE(job_row.requirements, '')) LIKE '%' || LOWER(alert_row.keywords) || '%'
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check location match (case-insensitive, partial match)
  IF alert_row.location IS NOT NULL AND alert_row.location != '' THEN
    IF NOT (
      LOWER(job_row.location) LIKE '%' || LOWER(alert_row.location) || '%'
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Job must be published
  IF NOT job_row.is_published THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 7. Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type_param text,
  target_user_id_param uuid DEFAULT NULL,
  target_resource_type_param text DEFAULT NULL,
  target_resource_id_param uuid DEFAULT NULL,
  old_values_param jsonb DEFAULT NULL,
  new_values_param jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action_type,
    target_user_id,
    target_resource_type,
    target_resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    action_type_param,
    target_user_id_param,
    target_resource_type_param,
    target_resource_id_param,
    old_values_param,
    new_values_param
  );
END;
$$;