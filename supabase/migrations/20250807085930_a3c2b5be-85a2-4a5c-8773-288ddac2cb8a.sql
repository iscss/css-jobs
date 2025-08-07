-- Update existing 'both' user types to 'job_poster'
UPDATE public.user_profiles 
SET user_type = 'job_poster' 
WHERE user_type = 'both';