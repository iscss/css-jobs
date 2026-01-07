-- CSS Job Board - Initial Schema
-- Consolidated from 18 development migrations

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.job_type AS ENUM ('PhD', 'Postdoc', 'Faculty', 'RA', 'Internship', 'Other');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================
-- CORE TABLES
-- ============================================

-- Jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  institution TEXT NOT NULL,
  department TEXT,
  location TEXT NOT NULL,
  job_type job_type NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  requirements TEXT,
  application_deadline DATE,
  duration TEXT,
  is_remote BOOLEAN DEFAULT false,
  application_url TEXT,
  contact_email TEXT,
  pi_name TEXT,
  funding_source TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  approval_status TEXT CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')) DEFAULT 'draft',
  posted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT title_length CHECK (length(title) <= 200 AND length(title) >= 5),
  CONSTRAINT institution_length_jobs CHECK (length(institution) <= 200 AND length(institution) >= 2),
  CONSTRAINT description_length CHECK (length(description) >= 50 AND length(description) <= 10000),
  CONSTRAINT valid_application_url CHECK (application_url IS NULL OR application_url ~* '^https?://'),
  CONSTRAINT valid_contact_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Job tags table
CREATE TABLE public.job_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  institution TEXT,
  is_approved_poster BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  orcid_id TEXT,
  google_scholar_url TEXT,
  website_url TEXT,
  user_type TEXT CHECK (user_type IN ('job_seeker', 'job_poster')) DEFAULT 'job_seeker',
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
  requested_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_jobs_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT full_name_length CHECK (full_name IS NULL OR length(full_name) <= 100),
  CONSTRAINT institution_length CHECK (institution IS NULL OR length(institution) <= 200),
  CONSTRAINT valid_google_scholar_url CHECK (google_scholar_url IS NULL OR google_scholar_url ~* '^https?://'),
  CONSTRAINT valid_website_url CHECK (website_url IS NULL OR website_url ~* '^https?://')
);

-- Add foreign key from jobs to user_profiles
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_posted_by_fkey
FOREIGN KEY (posted_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Poster applications table
CREATE TABLE public.poster_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution TEXT NOT NULL,
  justification TEXT NOT NULL,
  status application_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Saved jobs table
CREATE TABLE public.saved_jobs (
  user_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- ============================================
-- ALERT/NOTIFICATION TABLES
-- ============================================

-- Job alerts table
CREATE TABLE public.job_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  keywords TEXT,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  new_jobs BOOLEAN NOT NULL DEFAULT true,
  deadline_reminders BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  email_frequency TEXT DEFAULT 'immediate',
  deadline_days_before INTEGER DEFAULT 3,
  deadline_time_preference TEXT DEFAULT 'morning',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job alert matches table
CREATE TABLE public.job_alert_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_id UUID NOT NULL,
  alert_id UUID NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, job_id, alert_id)
);

-- Email queue table
CREATE TABLE public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  template_type TEXT,
  user_id UUID,
  job_id UUID,
  alert_id UUID,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ADMIN TABLES
-- ============================================

-- Admin audit log table
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_resource_type TEXT,
  target_resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approved domains table (for university email auto-approval)
CREATE TABLE public.approved_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  institution_name TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

ALTER TABLE job_alerts
ADD CONSTRAINT job_alerts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE job_alert_matches
ADD CONSTRAINT job_alert_matches_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE job_alert_matches
ADD CONSTRAINT job_alert_matches_job_id_fkey
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE email_queue
ADD CONSTRAINT email_queue_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE email_queue
ADD CONSTRAINT email_queue_job_id_fkey
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE notification_settings
ADD CONSTRAINT notification_settings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE saved_jobs
ADD CONSTRAINT saved_jobs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poster_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alert_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_domains ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if user is admin
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

-- Function to check if current user can access admin profiles
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

-- Function to check if user can view sensitive profile data
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    auth.uid() = profile_user_id OR
    COALESCE((SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()), false);
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to handle new user signup
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
  user_type_from_meta := COALESCE(NEW.raw_user_meta_data->>'user_type', 'job_seeker');

  IF user_type_from_meta = 'job_poster' THEN
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

-- Function to get admin user profiles
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
  auth_created_at timestamp with time zone
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
    au.created_at as auth_created_at
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  WHERE public.is_admin(auth.uid());
$$;

-- Function to log admin actions
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

-- Function to check if job matches alert
CREATE OR REPLACE FUNCTION public.job_matches_alert(job_row public.jobs, alert_row public.job_alerts)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF alert_row.keywords IS NOT NULL AND alert_row.keywords != '' THEN
    IF NOT (
      LOWER(job_row.title) LIKE '%' || LOWER(alert_row.keywords) || '%' OR
      LOWER(job_row.description) LIKE '%' || LOWER(alert_row.keywords) || '%' OR
      LOWER(COALESCE(job_row.requirements, '')) LIKE '%' || LOWER(alert_row.keywords) || '%'
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF alert_row.location IS NOT NULL AND alert_row.location != '' THEN
    IF NOT (
      LOWER(job_row.location) LIKE '%' || LOWER(alert_row.location) || '%'
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF NOT job_row.is_published THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to create job alert matches
CREATE OR REPLACE FUNCTION public.create_job_alert_matches(job_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job_row public.jobs%ROWTYPE;
  alert_row public.job_alerts%ROWTYPE;
  matches_count INTEGER := 0;
BEGIN
  SELECT * INTO job_row FROM public.jobs WHERE id = job_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', job_id_param;
  END IF;

  FOR alert_row IN
    SELECT * FROM public.job_alerts
    WHERE is_active = true
  LOOP
    IF public.job_matches_alert(job_row, alert_row) THEN
      INSERT INTO public.job_alert_matches (user_id, job_id, alert_id)
      VALUES (alert_row.user_id, job_id_param, alert_row.id)
      ON CONFLICT (user_id, job_id, alert_id) DO NOTHING;

      matches_count := matches_count + 1;
    END IF;
  END LOOP;

  RETURN matches_count;
END;
$$;

-- Trigger function to create job matches
CREATE OR REPLACE FUNCTION public.trigger_create_job_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    PERFORM public.create_job_alert_matches(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to get user job matches
CREATE OR REPLACE FUNCTION public.get_user_job_matches(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE(job_id uuid, job_title text, job_institution text, job_location text, alert_keywords text, alert_location text, matched_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.institution,
    j.location,
    ja.keywords,
    ja.location,
    jam.matched_at
  FROM public.job_alert_matches jam
  JOIN public.jobs j ON j.id = jam.job_id
  JOIN public.job_alerts ja ON ja.id = jam.alert_id
  WHERE jam.user_id = user_id_param
  ORDER BY jam.matched_at DESC
  LIMIT limit_param;
END;
$$;

-- Function to count unread job matches
CREATE OR REPLACE FUNCTION public.count_unread_job_matches(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO match_count
  FROM public.job_alert_matches jam
  WHERE jam.user_id = user_id_param
    AND jam.matched_at >= now() - INTERVAL '7 days';

  RETURN COALESCE(match_count, 0);
END;
$$;

-- Function to queue job alert emails
CREATE OR REPLACE FUNCTION public.queue_job_alert_emails(job_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job_row public.jobs%ROWTYPE;
  alert_row public.job_alerts%ROWTYPE;
  user_row public.user_profiles%ROWTYPE;
  notification_row public.notification_settings%ROWTYPE;
  email_subject TEXT;
  email_content TEXT;
  matches_count INTEGER := 0;
  should_send_immediate BOOLEAN;
BEGIN
  SELECT * INTO job_row FROM public.jobs WHERE id = job_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', job_id_param;
  END IF;

  FOR alert_row IN
    SELECT * FROM public.job_alerts
    WHERE is_active = true
  LOOP
    IF public.job_matches_alert(job_row, alert_row) THEN
      SELECT * INTO user_row
      FROM public.user_profiles
      WHERE id = alert_row.user_id;

      SELECT * INTO notification_row
      FROM public.notification_settings
      WHERE user_id = alert_row.user_id;

      IF COALESCE(notification_row.new_jobs, true) THEN
        should_send_immediate := COALESCE(notification_row.email_frequency, 'immediate') = 'immediate';

        INSERT INTO public.job_alert_matches (user_id, job_id, alert_id)
        VALUES (alert_row.user_id, job_id_param, alert_row.id)
        ON CONFLICT (user_id, job_id, alert_id) DO NOTHING;

        IF should_send_immediate THEN
          email_subject := 'New Job Alert: ' || job_row.title || ' at ' || job_row.institution;
          email_content := format(
            '<h2>New Job Opportunity Matching Your Alert</h2>
             <h3>%s</h3>
             <p><strong>Institution:</strong> %s</p>
             <p><strong>Location:</strong> %s</p>
             <p><strong>Type:</strong> %s</p>
             <p><strong>Description:</strong></p>
             <p>%s</p>',
            job_row.title,
            job_row.institution,
            job_row.location,
            job_row.job_type,
            LEFT(job_row.description, 300) || CASE WHEN LENGTH(job_row.description) > 300 THEN '...' ELSE '' END
          );

          INSERT INTO public.email_queue (
            recipient_email,
            subject,
            html_content,
            template_type,
            user_id,
            job_id,
            alert_id,
            metadata
          ) VALUES (
            COALESCE(user_row.email, (SELECT email FROM auth.users WHERE id = alert_row.user_id)),
            email_subject,
            email_content,
            'job_alert',
            alert_row.user_id,
            job_id_param,
            alert_row.id,
            jsonb_build_object(
              'alert_keywords', alert_row.keywords,
              'alert_location', alert_row.location
            )
          );

          UPDATE public.job_alert_matches
          SET sent_at = now()
          WHERE user_id = alert_row.user_id AND job_id = job_id_param AND alert_id = alert_row.id;
        END IF;

        matches_count := matches_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN matches_count;
END;
$$;

-- Trigger function to queue job alerts
CREATE OR REPLACE FUNCTION public.trigger_queue_job_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    PERFORM public.queue_job_alert_emails(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Function to queue deadline reminders
CREATE OR REPLACE FUNCTION public.queue_deadline_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job_row public.jobs%ROWTYPE;
  user_row public.user_profiles%ROWTYPE;
  notification_row public.notification_settings%ROWTYPE;
  saved_job_row public.saved_jobs%ROWTYPE;
  email_subject TEXT;
  email_content TEXT;
  reminder_count INTEGER := 0;
  deadline_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR notification_row IN
    SELECT * FROM public.notification_settings
    WHERE deadline_reminders = true
  LOOP
    deadline_threshold := now() + (COALESCE(notification_row.deadline_days_before, 3) || ' days')::INTERVAL;

    SELECT * INTO user_row
    FROM public.user_profiles
    WHERE id = notification_row.user_id;

    FOR saved_job_row IN
      SELECT sj.* FROM public.saved_jobs sj
      JOIN public.jobs j ON j.id = sj.job_id
      WHERE sj.user_id = notification_row.user_id
        AND j.application_deadline IS NOT NULL
        AND j.application_deadline <= deadline_threshold::DATE
        AND j.application_deadline >= CURRENT_DATE
        AND NOT EXISTS (
          SELECT 1 FROM public.email_queue eq
          WHERE eq.user_id = sj.user_id
            AND eq.job_id = sj.job_id
            AND eq.template_type = 'deadline_reminder'
            AND eq.sent_at IS NOT NULL
            AND eq.created_at > now() - INTERVAL '7 days'
        )
    LOOP
      SELECT * INTO job_row FROM public.jobs WHERE id = saved_job_row.job_id;

      email_subject := 'Deadline Reminder: ' || job_row.title || ' (Due: ' || job_row.application_deadline || ')';
      email_content := format(
        '<h2>Application Deadline Reminder</h2>
         <h3>%s</h3>
         <p><strong>Institution:</strong> %s</p>
         <p><strong>Deadline:</strong> %s</p>
         <p><strong>Days Remaining:</strong> %s</p>
         <p>Don''t forget to submit your application!</p>',
        job_row.title,
        job_row.institution,
        job_row.application_deadline,
        job_row.application_deadline - CURRENT_DATE
      );

      INSERT INTO public.email_queue (
        recipient_email,
        subject,
        html_content,
        template_type,
        user_id,
        job_id,
        scheduled_for,
        metadata
      ) VALUES (
        COALESCE(user_row.email, (SELECT email FROM auth.users WHERE id = notification_row.user_id)),
        email_subject,
        email_content,
        'deadline_reminder',
        notification_row.user_id,
        saved_job_row.job_id,
        CASE notification_row.deadline_time_preference
          WHEN 'morning' THEN CURRENT_DATE + INTERVAL '9 hours'
          WHEN 'afternoon' THEN CURRENT_DATE + INTERVAL '14 hours'
          WHEN 'evening' THEN CURRENT_DATE + INTERVAL '18 hours'
          ELSE CURRENT_DATE + INTERVAL '9 hours'
        END,
        jsonb_build_object(
          'deadline_date', job_row.application_deadline,
          'days_before', notification_row.deadline_days_before
        )
      );

      reminder_count := reminder_count + 1;
    END LOOP;
  END LOOP;

  RETURN reminder_count;
END;
$$;

-- Function to auto-approve users by domain
CREATE OR REPLACE FUNCTION public.auto_approve_user_by_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  email_domain TEXT;
  is_approved_domain BOOLEAN;
BEGIN
  IF NEW.email IS NOT NULL THEN
    email_domain := split_part(NEW.email, '@', 2);

    SELECT EXISTS(
      SELECT 1 FROM public.approved_domains
      WHERE domain = email_domain
    ) INTO is_approved_domain;

    IF is_approved_domain THEN
      UPDATE public.user_profiles
      SET
        is_approved_poster = true,
        approval_status = 'approved',
        approved_at = now()
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update timestamps on job_alerts
CREATE TRIGGER update_job_alerts_updated_at
  BEFORE UPDATE ON public.job_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update timestamps on notification_settings
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES - Jobs
-- ============================================

CREATE POLICY "Anyone can view published jobs" ON public.jobs
  FOR SELECT USING (is_published = true AND approval_status = 'approved');

CREATE POLICY "Users can view their own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = posted_by);

CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Approved posters can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND (is_approved_poster = true OR is_admin = true)
    )
  );

CREATE POLICY "Users can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Admins can update any job" ON public.jobs
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Users can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = posted_by);

CREATE POLICY "Admins can delete any job" ON public.jobs
  FOR DELETE USING (is_admin(auth.uid()));

-- ============================================
-- RLS POLICIES - Job Tags
-- ============================================

CREATE POLICY "Anyone can view job tags" ON public.job_tags
  FOR SELECT USING (true);

CREATE POLICY "Job owners can manage tags" ON public.job_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE id = job_id AND posted_by = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES - User Profiles
-- ============================================

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

CREATE POLICY "Admins can delete user profiles" ON public.user_profiles
  FOR DELETE USING (is_admin(auth.uid()));

CREATE POLICY "Public can view basic profile info"
  ON public.user_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Sensitive profile data access restricted"
  ON public.user_profiles
  FOR SELECT
  USING (public.can_view_sensitive_profile_data(id));

-- ============================================
-- RLS POLICIES - Poster Applications
-- ============================================

CREATE POLICY "Users can view their own applications" ON public.poster_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON public.poster_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" ON public.poster_applications
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update applications" ON public.poster_applications
  FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================
-- RLS POLICIES - Saved Jobs
-- ============================================

CREATE POLICY "Users can manage their own saved jobs" ON public.saved_jobs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - Job Alerts
-- ============================================

CREATE POLICY "Users can manage their own job alerts" ON public.job_alerts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - Notification Settings
-- ============================================

CREATE POLICY "Users can manage their own notification settings" ON public.notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES - Admin Tables
-- ============================================

CREATE POLICY "Only admins can view audit logs" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Anyone can view approved domains" ON public.approved_domains
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage approved domains" ON public.approved_domains
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_jobs_published ON public.jobs(is_published);
CREATE INDEX idx_jobs_deadline ON public.jobs(application_deadline);
CREATE INDEX idx_jobs_type ON public.jobs(job_type);
CREATE INDEX idx_jobs_featured ON public.jobs(is_featured);
CREATE INDEX idx_job_tags_job_id ON public.job_tags(job_id);
CREATE INDEX idx_job_tags_tag ON public.job_tags(tag);
