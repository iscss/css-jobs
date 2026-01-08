-- Add missing columns that the code expects

-- Jobs table: columns for tracking who approved a job and when
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_by_admin UUID REFERENCES auth.users(id);

-- User_profiles table: column for allowing direct publishing (no approval needed)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS can_publish_directly BOOLEAN DEFAULT false;
