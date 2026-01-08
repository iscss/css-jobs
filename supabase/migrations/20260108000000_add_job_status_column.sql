-- Add job_status column to track whether a position is still open or has been filled
-- This is separate from approval_status (workflow) and is_published (visibility)

-- Add the column with default value 'active'
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_status TEXT DEFAULT 'active';

-- Add check constraint for valid values
ALTER TABLE jobs ADD CONSTRAINT jobs_job_status_check
  CHECK (job_status IN ('active', 'filled'));

-- Create index for filtering by job_status (used in public job listings)
CREATE INDEX IF NOT EXISTS idx_jobs_job_status ON jobs(job_status);

-- Create or replace the increment_approved_jobs_count function
-- This is called when a job is approved to track how many jobs a user has had approved
CREATE OR REPLACE FUNCTION increment_approved_jobs_count(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET approved_jobs_count = COALESCE(approved_jobs_count, 0) + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
