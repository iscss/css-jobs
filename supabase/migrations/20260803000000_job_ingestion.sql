-- Automated job ingestion
--
-- Adds provenance columns to jobs, a job_sources registry, a scrape run log,
-- and a bot account that owns automatically imported postings.
--
-- Imported jobs always enter as approval_status='pending' / is_published=false
-- so an admin approves them before they are publicly visible. The existing
-- "Anyone can view published jobs" policy already hides pending rows.

-- ============================================
-- Reconcile job_type enum drift
-- ============================================
-- The initial schema created job_type with 'RA', but production was altered
-- to 'Research Assistant' outside of version control (the frontend and the
-- generated types both use 'Research Assistant'). Bring migrated databases
-- in line so local and production agree.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'job_type' AND e.enumlabel = 'RA'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'job_type' AND e.enumlabel = 'Research Assistant'
  ) THEN
    ALTER TYPE public.job_type RENAME VALUE 'RA' TO 'Research Assistant';
  END IF;
END $$;

-- ============================================
-- Reconcile columns added outside version control
-- ============================================
-- These exist in the hosted database and in the generated types, but were
-- never captured in a migration. Without them a database rebuilt from this
-- repo does not match production. IF NOT EXISTS makes this a no-op on the
-- hosted instance.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status_updated_by UUID,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notification_sent_by UUID;

-- ============================================
-- Provenance columns on jobs
-- ============================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_job_id TEXT,
  ADD COLUMN IF NOT EXISTS is_auto_imported BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS relevance_score NUMERIC(4, 3),
  ADD COLUMN IF NOT EXISTS relevance_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS valid_source_url;
ALTER TABLE public.jobs
  ADD CONSTRAINT valid_source_url
  CHECK (source_url IS NULL OR source_url ~* '^https?://');

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS valid_relevance_score;
ALTER TABLE public.jobs
  ADD CONSTRAINT valid_relevance_score
  CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1));

-- Primary dedupe key: the same posting must never be imported twice.
-- Partial so that manually posted jobs (source_url IS NULL) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_url_unique
  ON public.jobs (source_url)
  WHERE source_url IS NOT NULL;

-- Secondary dedupe key: catches the same role syndicated to several feeds
-- under different URLs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_content_hash_unique
  ON public.jobs (content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_relevance
  ON public.jobs (relevance_score DESC NULLS LAST)
  WHERE is_auto_imported = true;

CREATE INDEX IF NOT EXISTS idx_jobs_source ON public.jobs (source);

-- ============================================
-- Source registry
-- ============================================
-- Feeds are data, not code: a new source can be added or paused with an
-- INSERT/UPDATE rather than a deploy.

CREATE TABLE IF NOT EXISTS public.job_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  adapter TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_feed_url CHECK (feed_url ~* '^https?://')
);

ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage job sources" ON public.job_sources;
CREATE POLICY "Admins can manage job sources" ON public.job_sources
  FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================
-- Scrape run log
-- ============================================
-- Without this a silently broken feed looks identical to a quiet one.

CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_slug TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'error')),
  fetched_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_source
  ON public.scrape_runs (source_slug, started_at DESC);

ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view scrape runs" ON public.scrape_runs;
CREATE POLICY "Admins can view scrape runs" ON public.scrape_runs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================
-- Table grants
-- ============================================
-- Supabase's default ACLs only cover tables created by supabase_admin, but
-- migrations run as postgres, so tables created here start with no DML grants
-- for the API roles and every request fails with "permission denied" before
-- RLS is even consulted. Grant them explicitly.
--
-- public.jobs is included because it is in the same position: the hosted
-- database was granted through the dashboard, so a database built purely from
-- these migrations (local, CI, or a fresh project) would otherwise be unable
-- to read or write jobs at all. RLS remains the access control; these grants
-- only make the tables reachable.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_sources
  TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_runs
  TO service_role, authenticated;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jobs', 'job_tags', 'user_profiles', 'saved_jobs', 'job_alerts',
    'notification_settings', 'job_alert_matches', 'email_queue',
    'poster_applications', 'admin_audit_log', 'approved_domains'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role, authenticated',
        t
      );
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Bot account
-- ============================================
-- jobs.posted_by is NOT NULL and references user_profiles(id), which in turn
-- references auth.users(id), so imported jobs need a real (never-logged-into)
-- auth user to own them.

DO $$
DECLARE
  bot_id UUID := '00000000-0000-4000-a000-000000000b07';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = bot_id) THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    ) VALUES (
      bot_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'bot@jobs.iscss.org',
      -- No valid password hash: this account cannot be signed into.
      'x',
      now(),
      now(),
      now(),
      '{"provider":"system","providers":["system"]}'::jsonb,
      '{"full_name":"CSS Jobs Bot"}'::jsonb,
      false
    );
  END IF;

  INSERT INTO public.user_profiles (
    id, full_name, email, institution,
    is_approved_poster, is_admin, user_type, approval_status
  ) VALUES (
    bot_id,
    'CSS Jobs Bot',
    'bot@jobs.iscss.org',
    'International Society for Computational Social Science',
    true,
    false,
    'job_poster',
    'approved'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        is_approved_poster = true;
END $$;

-- Helper so application code never hardcodes the bot UUID.
CREATE OR REPLACE FUNCTION public.job_bot_id()
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '00000000-0000-4000-a000-000000000b07'::uuid;
$$;

-- ============================================
-- Guard: imported jobs may never self-publish
-- ============================================
-- Defence in depth. Even if ingestion code is wrong, a job owned by the bot
-- cannot reach the public site without an admin acting on it: the trigger
-- forces pending/unpublished on insert. Admin approval (an UPDATE) is
-- unaffected.

CREATE OR REPLACE FUNCTION public.enforce_imported_jobs_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_auto_imported THEN
    NEW.is_published := false;
    NEW.approval_status := 'pending';
    NEW.is_featured := false;
    NEW.imported_at := COALESCE(NEW.imported_at, now());
    NEW.submitted_for_approval_at :=
      COALESCE(NEW.submitted_for_approval_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_imported_jobs_pending ON public.jobs;
CREATE TRIGGER trg_imported_jobs_pending
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_imported_jobs_pending();

-- ============================================
-- Seed the first source
-- ============================================
-- jobRxiv publishes a real RSS job feed with structured location/type/company
-- fields and supports posts_per_page for batching.

INSERT INTO public.job_sources (slug, name, adapter, feed_url, config)
VALUES (
  'jobrxiv',
  'jobRxiv',
  'rss-jobrxiv',
  'https://jobrxiv.org/?feed=job_feed',
  '{"posts_per_page": 100}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
