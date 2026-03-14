// =============================================================================
// CareerPilot — Shared TypeScript types
// These interfaces mirror the database tables 1-to-1.
// Column names use camelCase here to match JS conventions; the DB uses snake_case.
// =============================================================================


// =============================================================================
// Database row types (match every column in schema.sql)
// =============================================================================

/** Mirrors the `profiles` table */
export interface Profile {
    id: string;                  // UUID — same as auth.users.id
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;          // ISO timestamp
    updated_at: string;
}

/** Mirrors the `cvs` table */
export interface Cv {
    id: string;
    user_id: string;
    file_name: string;
    file_path: string;           // path inside the `cvs` storage bucket
    parsed_text: string | null;
    parsed_data: ParsedCvData | null; // structured profile data from AI
    is_active: boolean;
    uploaded_at: string;
}

export interface ParsedCvData {
    current_role: string;
    seniority_level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
    years_of_experience: number;
    skills: string[];
    education: {
      degree: string;
      institution: string;
      year?: number;
    }[];
    experience: {
      title: string;
      company: string;
      duration: string;
      summary: string;
    }[];
    achievements: string[];
}

/** Mirrors the `job_analyses` table */
export interface JobAnalysis {
    id: string;
    user_id: string;
    cv_id: string | null;
    job_title: string;
    company: string | null;
    job_raw_text: string;
    fit_score: number | null;    // 0–100
    matched_skills: string[];
    missing_skills: string[];
    cv_suggestions: string[];
    created_at: string;
}

/** Shape of each element inside interview_sessions.questions (JSONB) */
export interface InterviewQuestion {
    id: string;
    question: string;
    user_answer: string | null;
    score: number | null;        // 0–10
    feedback: string | null;
}

/** Mirrors the `interview_sessions` table */
export interface InterviewSession {
    id: string;
    user_id: string;
    job_analysis_id: string | null;
    questions: InterviewQuestion[];
    created_at: string;
}

/** Shape of each element inside career_roadmaps.steps (JSONB) */
export interface CareerStep {
    id: string;
    title: string;
    description: string;
    skills_to_learn: string[];
    projects_to_build: string[];
    estimated_months: number;
}

/** Mirrors the `career_roadmaps` table */
export interface CareerRoadmap {
    id: string;
    user_id: string;
    current_role: string;
    target_role: string;
    steps: CareerStep[];
    created_at: string;
}


// =============================================================================
// Application-level DTOs (used in UI / API request/response shapes)
// =============================================================================

/** Payload sent when the user submits a job listing for analysis */
export interface AnalyseJobPayload {
    cvId: string;
    jobTitle: string;
    company?: string;
    jobRawText: string;
}

/** Payload sent when starting a mock-interview session */
export interface StartInterviewPayload {
    jobAnalysisId: string;
}

/** Payload sent when the user submits an answer during a mock interview */
export interface SubmitAnswerPayload {
    sessionId: string;
    questionId: string;
    answer: string;
}

/** Payload sent when generating a career roadmap */
export interface GenerateRoadmapPayload {
    currentRole: string;
    targetRole: string;
    cvId?: string;
}
