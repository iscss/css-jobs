-- Allow any job_poster user to create jobs (drafts/pending)
-- Approval status controls the workflow, not the ability to create

DROP POLICY IF EXISTS "Approved posters can create jobs" ON public.jobs;

CREATE POLICY "Job posters can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND user_type = 'job_poster'
    )
  );
