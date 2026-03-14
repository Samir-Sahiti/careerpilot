-- =============================================================================
-- CareerPilot — Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================


-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- One row per user, auto-created via a trigger when someone signs up.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- cvs
-- Tracks every CV file a user uploads. Files are stored in the `cvs` bucket.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cvs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,
  file_path    TEXT        NOT NULL,   -- path inside the `cvs` storage bucket
  parsed_text  TEXT,                   -- raw text extracted from the PDF/DOCX
  parsed_data  JSONB,                  -- structured profile data from AI
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- job_analyses
-- One row per job-listing analysis. Stores the raw listing plus AI results.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_analyses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id            UUID        REFERENCES cvs(id) ON DELETE SET NULL,
  job_title        TEXT        NOT NULL,
  company          TEXT,
  job_raw_text     TEXT        NOT NULL,
  fit_score        INTEGER     CHECK (fit_score >= 0 AND fit_score <= 100),
  matched_skills   TEXT[]      NOT NULL DEFAULT '{}',
  missing_skills   TEXT[]      NOT NULL DEFAULT '{}',
  cv_suggestions   TEXT[]      NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- interview_sessions
-- One mock-interview session per job analysis.
-- Questions + answers stored as JSONB for flexibility.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_analysis_id  UUID        REFERENCES job_analyses(id) ON DELETE SET NULL,
  questions        JSONB       NOT NULL DEFAULT '[]',
  -- JSONB shape: [{ id, question, user_answer, score, feedback }]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- career_roadmaps
-- One roadmap per user target (current → target role).
-- Steps stored as JSONB.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS career_roadmaps (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "current_role"  TEXT        NOT NULL,
  "target_role"   TEXT        NOT NULL,
  steps         JSONB       NOT NULL DEFAULT '[]',
  -- JSONB shape: [{ id, title, description, skills_to_learn, projects_to_build, estimated_months }]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 2. TRIGGER — auto-create a profile row when a new user signs up
-- =============================================================================

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


-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on every table
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_analyses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_roadmaps    ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "Users can only access their own data"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- ── cvs ──────────────────────────────────────────────────────────────────────
CREATE POLICY "Users can only access their own data"
  ON cvs FOR ALL
  USING (auth.uid() = user_id);

-- ── job_analyses ──────────────────────────────────────────────────────────────
CREATE POLICY "Users can only access their own data"
  ON job_analyses FOR ALL
  USING (auth.uid() = user_id);

-- ── interview_sessions ────────────────────────────────────────────────────────
CREATE POLICY "Users can only access their own data"
  ON interview_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ── career_roadmaps ───────────────────────────────────────────────────────────
CREATE POLICY "Users can only access their own data"
  ON career_roadmaps FOR ALL
  USING (auth.uid() = user_id);


-- =============================================================================
-- 4. STORAGE BUCKET
-- Run this AFTER creating the bucket manually in Storage → New bucket
-- (name: "cvs", Public: OFF) — or let this SQL do it for you:
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: users can only read/write their own files
-- Files must be stored at the path: {user_id}/{filename}

CREATE POLICY "Users can upload their own CVs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can read their own CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can delete their own CVs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cvs' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );
