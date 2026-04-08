-- schema-additions.sql

-- 1. Create Application Status Enum
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('saved', 'applied', 'interviewing', 'offered', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add salary_estimate column to job_analyses
ALTER TABLE job_analyses ADD COLUMN IF NOT EXISTS salary_estimate JSONB;

-- 3. Create cover_letters table
CREATE TABLE IF NOT EXISTS cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_analysis_id UUID REFERENCES job_analyses(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_analysis_id UUID REFERENCES job_analyses(id) ON DELETE SET NULL,
    cover_letter_id UUID REFERENCES cover_letters(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    company TEXT,
    job_url TEXT,
    status application_status NOT NULL DEFAULT 'saved',
    applied_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Updated At Trigger Function (if not exists from previous setup)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Attach trigger to applications
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
