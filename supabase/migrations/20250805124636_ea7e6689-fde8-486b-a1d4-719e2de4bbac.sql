-- Add foreign key constraint from jobs.posted_by to user_profiles.id
ALTER TABLE public.jobs 
DROP CONSTRAINT IF EXISTS jobs_posted_by_fkey;

ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_posted_by_fkey 
FOREIGN KEY (posted_by) REFERENCES public.user_profiles(id) ON DELETE CASCADE;