
-- Add role selection to user profiles
ALTER TABLE public.user_profiles 
ADD COLUMN user_type TEXT CHECK (user_type IN ('job_seeker', 'job_poster', 'both')) DEFAULT 'job_seeker',
ADD COLUMN approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- Update existing users to be approved job seekers by default
UPDATE public.user_profiles 
SET user_type = 'job_seeker', approval_status = 'approved', approved_at = now()
WHERE user_type IS NULL;

-- Users who want to post jobs need approval (except job seekers)
-- We'll handle this logic in the application
