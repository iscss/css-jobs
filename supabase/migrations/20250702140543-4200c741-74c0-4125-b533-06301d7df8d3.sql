
-- Create enum for job types
CREATE TYPE public.job_type AS ENUM ('PhD', 'Postdoc', 'Faculty', 'RA', 'Internship', 'Other');

-- Create enum for application status
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create jobs table
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
  posted_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_tags table for many-to-many relationship
CREATE TABLE public.job_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  institution TEXT,
  is_approved_poster BOOLEAN DEFAULT false,
  orcid_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poster_applications table
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

-- Create saved_jobs table for bookmarking
CREATE TABLE public.saved_jobs (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poster_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table
CREATE POLICY "Anyone can view published jobs" ON public.jobs
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users can view their own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = posted_by);

CREATE POLICY "Approved posters can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND is_approved_poster = true
    )
  );

CREATE POLICY "Users can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = posted_by);

CREATE POLICY "Users can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = posted_by);

-- RLS Policies for job_tags table
CREATE POLICY "Anyone can view job tags" ON public.job_tags
  FOR SELECT USING (true);

CREATE POLICY "Job owners can manage tags" ON public.job_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE id = job_id AND posted_by = auth.uid()
    )
  );

-- RLS Policies for user_profiles table
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id);

-- RLS Policies for poster_applications table
CREATE POLICY "Users can view their own applications" ON public.poster_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON public.poster_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for saved_jobs table
CREATE POLICY "Users can manage their own saved jobs" ON public.saved_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_jobs_published ON public.jobs(is_published);
CREATE INDEX idx_jobs_deadline ON public.jobs(application_deadline);
CREATE INDEX idx_jobs_type ON public.jobs(job_type);
CREATE INDEX idx_jobs_featured ON public.jobs(is_featured);
CREATE INDEX idx_job_tags_job_id ON public.job_tags(job_id);
CREATE INDEX idx_job_tags_tag ON public.job_tags(tag);
