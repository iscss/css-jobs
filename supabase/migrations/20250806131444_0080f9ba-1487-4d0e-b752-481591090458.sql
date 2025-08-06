-- Add CASCADE DELETE constraints for user-related tables
ALTER TABLE job_alerts 
DROP CONSTRAINT IF EXISTS job_alerts_user_id_fkey,
ADD CONSTRAINT job_alerts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE job_alert_matches 
DROP CONSTRAINT IF EXISTS job_alert_matches_user_id_fkey,
ADD CONSTRAINT job_alert_matches_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE job_alert_matches 
DROP CONSTRAINT IF EXISTS job_alert_matches_job_id_fkey,
ADD CONSTRAINT job_alert_matches_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE email_queue 
DROP CONSTRAINT IF EXISTS email_queue_user_id_fkey,
ADD CONSTRAINT email_queue_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE email_queue 
DROP CONSTRAINT IF EXISTS email_queue_job_id_fkey,
ADD CONSTRAINT email_queue_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

ALTER TABLE notification_settings 
DROP CONSTRAINT IF EXISTS notification_settings_user_id_fkey,
ADD CONSTRAINT notification_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE saved_jobs 
DROP CONSTRAINT IF EXISTS saved_jobs_user_id_fkey,
ADD CONSTRAINT saved_jobs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE saved_jobs 
DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey,
ADD CONSTRAINT saved_jobs_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Add admin RLS policies for jobs deletion
CREATE POLICY "Admins can delete any job" ON jobs
FOR DELETE USING (is_admin(auth.uid()));

-- Add admin RLS policies for user profiles deletion  
CREATE POLICY "Admins can delete user profiles" ON user_profiles
FOR DELETE USING (is_admin(auth.uid()));