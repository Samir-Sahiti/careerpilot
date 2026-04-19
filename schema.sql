-- =============================================================================
-- CareerPilot — Complete Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
--
-- Safe to run on a fresh database OR re-run on an existing one:
-- - All tables use CREATE TABLE IF NOT EXISTS
-- - All policies use DROP POLICY IF EXISTS + CREATE POLICY
-- - All functions use CREATE OR REPLACE
-- =============================================================================


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'saved', 'applied', 'interviewing', 'offered', 'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- One row per user, auto-created via trigger on signup.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  avatar_url            TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent migration for existing databases
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- cvs
-- Tracks every CV file a user uploads. Files live in the `cvs` storage bucket.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cvs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT        NOT NULL,
  file_path     TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  parsed_text   TEXT,
  parsed_data   JSONB,
  parse_status  TEXT        NOT NULL DEFAULT 'pending',
  parse_error   TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- job_analyses
-- One row per job-listing analysis. Stores raw listing + AI results.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_analyses (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id                 UUID        REFERENCES cvs(id) ON DELETE SET NULL,
  job_title             TEXT        NOT NULL,
  company               TEXT,
  job_raw_text          TEXT        NOT NULL,
  fit_score             INTEGER     CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_score_basis       TEXT        CHECK (fit_score_basis IN ('explicit', 'inferred', 'speculative')),
  fit_score_rationale   TEXT,
  recommendation        TEXT        CHECK (recommendation IN ('apply', 'maybe', 'skip')),
  recommendation_reason TEXT,
  matched_skills        TEXT[]      NOT NULL DEFAULT '{}',
  missing_skills        TEXT[]      NOT NULL DEFAULT '{}',
  cv_suggestions        TEXT[]      NOT NULL DEFAULT '{}',
  salary_estimate       JSONB,
  -- JSONB shape: { shown_in_listing, currency?, low?, mid?, high?, guidance?, negotiation_tip }
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent migrations for existing databases
ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS fit_score_basis     TEXT CHECK (fit_score_basis IN ('explicit', 'inferred', 'speculative'));
ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS fit_score_rationale TEXT;

-- -----------------------------------------------------------------------------
-- interview_sessions
-- One mock-interview session, optionally linked to a job analysis.
-- Questions + answers stored as JSONB for flexibility.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_analysis_id  UUID        REFERENCES job_analyses(id) ON DELETE SET NULL,
  questions        JSONB       NOT NULL DEFAULT '[]',
  overall_score    INTEGER     CHECK (overall_score >= 0 AND overall_score <= 100),
  -- JSONB shape: [{ id, question_text, type, guidance, user_answer, score, feedback }]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- career_roadmaps
-- AI-generated career progression paths for the user's active CV.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS career_roadmaps (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "current_role" TEXT      NOT NULL,
  paths        JSONB       NOT NULL DEFAULT '[]',
  -- JSONB shape: [{ path_title, next_role, timeline_estimate,
  --                 missing_skills[], recommended_projects[], experience_needed }]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- cover_letters
-- AI-generated cover letters, optionally linked to a job analysis.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cover_letters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_analysis_id  UUID        REFERENCES job_analyses(id) ON DELETE SET NULL,
  job_title        TEXT        NOT NULL,
  company          TEXT,
  content          TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- applications
-- Job application tracker. Links to a job analysis and/or cover letter.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID               NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_analysis_id  UUID               REFERENCES job_analyses(id) ON DELETE SET NULL,
  cover_letter_id  UUID               REFERENCES cover_letters(id) ON DELETE SET NULL,
  job_title        TEXT               NOT NULL,
  company          TEXT,
  job_url          TEXT,
  status           application_status NOT NULL DEFAULT 'saved',
  applied_at       TIMESTAMPTZ,
  notes            TEXT,
  -- Outcome tracking (populated via modal when status transitions to interviewing/offered/rejected)
  outcome_stage_reached        TEXT,       -- 'no_response'|'recruiter_screen'|'phone_screen'|'technical'|'onsite'|'offer'
  outcome_reason               TEXT,       -- free-text, user-provided
  outcome_fit_score_at_apply   INTEGER,    -- snapshot of job_analyses.fit_score when applied_at was first set
  outcome_captured_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- Idempotent migrations for existing databases
ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_stage_reached      TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_reason              TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_fit_score_at_apply  INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS outcome_captured_at         TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS follow_up_sent_at           TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS follow_up_draft             TEXT;

-- -----------------------------------------------------------------------------
-- tailored_cvs
-- AI-tailored CV versions linked to a specific job analysis.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tailored_cvs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id            UUID        NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  job_analysis_id  UUID        NOT NULL REFERENCES job_analyses(id) ON DELETE CASCADE,
  tailored_data    JSONB       NOT NULL,
  user_edits       JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- rate_limit_events
-- Tracks AI request events for per-user rate limiting.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user_time
  ON rate_limit_events(user_id, created_at);


-- =============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep applications.updated_at current on every update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE tailored_cvs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_analyses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmaps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events  ENABLE ROW LEVEL SECURITY;

-- tailored_cvs
DROP POLICY IF EXISTS "Users can only access their own data" ON tailored_cvs;
CREATE POLICY "Users can only access their own data"
  ON tailored_cvs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "Users can only access their own data" ON profiles;
CREATE POLICY "Users can only access their own data"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- cvs
DROP POLICY IF EXISTS "Users can only access their own data" ON cvs;
CREATE POLICY "Users can only access their own data"
  ON cvs FOR ALL
  USING (auth.uid() = user_id);

-- job_analyses
DROP POLICY IF EXISTS "Users can only access their own data" ON job_analyses;
CREATE POLICY "Users can only access their own data"
  ON job_analyses FOR ALL
  USING (auth.uid() = user_id);

-- interview_sessions
DROP POLICY IF EXISTS "Users can only access their own data" ON interview_sessions;
CREATE POLICY "Users can only access their own data"
  ON interview_sessions FOR ALL
  USING (auth.uid() = user_id);

-- career_roadmaps
DROP POLICY IF EXISTS "Users can only access their own data" ON career_roadmaps;
CREATE POLICY "Users can only access their own data"
  ON career_roadmaps FOR ALL
  USING (auth.uid() = user_id);

-- cover_letters
DROP POLICY IF EXISTS "Users can manage their own cover letters" ON cover_letters;
CREATE POLICY "Users can manage their own cover letters"
  ON cover_letters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- applications
DROP POLICY IF EXISTS "Users can manage their own applications" ON applications;
CREATE POLICY "Users can manage their own applications"
  ON applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- rate_limit_events
DROP POLICY IF EXISTS "Users can manage their own rate limit events" ON rate_limit_events;
CREATE POLICY "Users can manage their own rate limit events"
  ON rate_limit_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- 5. STORAGE BUCKET
-- Run AFTER the bucket exists — or let this create it:
-- Supabase Dashboard → Storage → New bucket (name: "cvs", Public: OFF)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Users can only upload/read/delete files at their own path: {user_id}/{filename}

DROP POLICY IF EXISTS "Users can upload their own CVs" ON storage.objects;
CREATE POLICY "Users can upload their own CVs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can read their own CVs" ON storage.objects;
CREATE POLICY "Users can read their own CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Users can delete their own CVs" ON storage.objects;
CREATE POLICY "Users can delete their own CVs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );
