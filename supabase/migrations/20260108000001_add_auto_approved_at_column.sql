-- Add auto_approved_at column to track when a user was auto-approved
-- to become a job poster via verified university email domain
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auto_approved_at TIMESTAMPTZ;
