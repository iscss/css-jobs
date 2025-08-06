-- Fix remaining security issues

-- 1. Fix the security definer view issue by dropping and recreating admin_user_profiles as a function
DROP VIEW IF EXISTS public.admin_user_profiles;

-- Create a secure function to get admin user profiles
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

-- 2. Update all remaining functions to have secure search_path
CREATE OR REPLACE FUNCTION public.job_matches_alert(job_row public.jobs, alert_row public.job_alerts)
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
  -- Get the job details
  SELECT * INTO job_row FROM public.jobs WHERE id = job_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', job_id_param;
  END IF;
  
  -- Loop through all active job alerts
  FOR alert_row IN 
    SELECT * FROM public.job_alerts 
    WHERE is_active = true
  LOOP
    -- Check if job matches this alert
    IF public.job_matches_alert(job_row, alert_row) THEN
      -- Create match record (for future email processing)
      INSERT INTO public.job_alert_matches (user_id, job_id, alert_id)
      VALUES (alert_row.user_id, job_id_param, alert_row.id)
      ON CONFLICT (user_id, job_id, alert_id) DO NOTHING;
      
      matches_count := matches_count + 1;
    END IF;
  END LOOP;
  
  RETURN matches_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_create_job_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only create matches for newly published jobs
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    PERFORM public.create_job_alert_matches(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

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
  -- Get the job details
  SELECT * INTO job_row FROM public.jobs WHERE id = job_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found: %', job_id_param;
  END IF;
  
  -- Loop through all active job alerts
  FOR alert_row IN 
    SELECT * FROM public.job_alerts 
    WHERE is_active = true
  LOOP
    -- Check if job matches this alert
    IF public.job_matches_alert(job_row, alert_row) THEN
      -- Get user profile and notification settings
      SELECT * INTO user_row 
      FROM public.user_profiles 
      WHERE id = alert_row.user_id;
      
      SELECT * INTO notification_row 
      FROM public.notification_settings 
      WHERE user_id = alert_row.user_id;
      
      -- Check if user wants job alert notifications
      IF COALESCE(notification_row.new_jobs, true) THEN
        -- Determine if we should send immediate email or queue for digest
        should_send_immediate := COALESCE(notification_row.email_frequency, 'immediate') = 'immediate';
        
        -- Create match record
        INSERT INTO public.job_alert_matches (user_id, job_id, alert_id)
        VALUES (alert_row.user_id, job_id_param, alert_row.id)
        ON CONFLICT (user_id, job_id, alert_id) DO NOTHING;
        
        -- Queue email if immediate delivery is requested
        IF should_send_immediate THEN
          -- Generate email content
          email_subject := 'New Job Alert: ' || job_row.title || ' at ' || job_row.institution;
          email_content := format(
            '<h2>New Job Opportunity Matching Your Alert</h2>
             <h3>%s</h3>
             <p><strong>Institution:</strong> %s</p>
             <p><strong>Location:</strong> %s</p>
             <p><strong>Type:</strong> %s</p>
             <p><strong>Description:</strong></p>
             <p>%s</p>
             <p><a href="%s/jobs">View Full Details</a></p>',
            job_row.title,
            job_row.institution,
            job_row.location,
            job_row.job_type,
            LEFT(job_row.description, 300) || CASE WHEN LENGTH(job_row.description) > 300 THEN '...' ELSE '' END,
            current_setting('app.base_url', true)
          );
          
          -- Queue the email
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
          
          -- Update match record with sent timestamp
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
  -- Loop through all users with deadline reminders enabled
  FOR notification_row IN 
    SELECT * FROM public.notification_settings 
    WHERE deadline_reminders = true
  LOOP
    -- Calculate deadline threshold based on user preferences
    deadline_threshold := now() + (COALESCE(notification_row.deadline_days_before, 3) || ' days')::INTERVAL;
    
    -- Get user profile
    SELECT * INTO user_row 
    FROM public.user_profiles 
    WHERE id = notification_row.user_id;
    
    -- Loop through user's saved jobs with upcoming deadlines
    FOR saved_job_row IN
      SELECT sj.* FROM public.saved_jobs sj
      JOIN public.jobs j ON j.id = sj.job_id
      WHERE sj.user_id = notification_row.user_id
        AND j.application_deadline IS NOT NULL
        AND j.application_deadline <= deadline_threshold::DATE
        AND j.application_deadline >= CURRENT_DATE
        -- Avoid duplicate reminders
        AND NOT EXISTS (
          SELECT 1 FROM public.email_queue eq 
          WHERE eq.user_id = sj.user_id 
            AND eq.job_id = sj.job_id 
            AND eq.template_type = 'deadline_reminder'
            AND eq.sent_at IS NOT NULL
            AND eq.created_at > now() - INTERVAL '7 days'
        )
    LOOP
      -- Get job details
      SELECT * INTO job_row FROM public.jobs WHERE id = saved_job_row.job_id;
      
      -- Generate email content
      email_subject := 'Deadline Reminder: ' || job_row.title || ' (Due: ' || job_row.application_deadline || ')';
      email_content := format(
        '<h2>Application Deadline Reminder</h2>
         <h3>%s</h3>
         <p><strong>Institution:</strong> %s</p>
         <p><strong>Deadline:</strong> %s</p>
         <p><strong>Days Remaining:</strong> %s</p>
         <p>Don''t forget to submit your application!</p>
         <p><a href="%s/jobs">View Job Details</a></p>',
        job_row.title,
        job_row.institution,
        job_row.application_deadline,
        job_row.application_deadline - CURRENT_DATE,
        current_setting('app.base_url', true)
      );
      
      -- Queue the email
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
        -- Schedule based on user's time preference
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

CREATE OR REPLACE FUNCTION public.trigger_queue_job_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only queue alerts for newly published jobs
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published = false) THEN
    PERFORM public.queue_job_alert_emails(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;