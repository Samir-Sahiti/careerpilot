// =============================================================================
// CareerPilot — Shared TypeScript types
// =============================================================================

// ── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── CV ────────────────────────────────────────────────────────────────────────
export interface Cv {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  parsed_text: string | null;
  parsed_data: ParsedCvData | null;
  parse_status: string;       // 'pending' | 'success' | 'failed'
  parse_error: string | null;
  is_active: boolean;
  uploaded_at: string;
}

export interface ParsedCvData {
  current_role: string;
  seniority_level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
  years_of_experience: number;
  skills: string[];
  education: { degree: string; institution: string; year?: number }[];
  experience: { title: string; company: string; duration: string; summary: string }[];
  achievements: string[];
}

// ── Job Analysis ──────────────────────────────────────────────────────────────
export type SalaryEstimate =
  | {
      shown_in_listing: true;
      currency: string;
      low: number;
      mid: number;
      high: number;
      negotiation_tip: string;
    }
  | {
      shown_in_listing: false;
      guidance: string;
      negotiation_tip: string;
    };

export type FitScoreBasis = 'explicit' | 'inferred' | 'speculative';

export interface JobAnalysis {
  id: string;
  user_id: string;
  cv_id: string | null;
  job_title: string;
  company: string | null;
  job_raw_text: string;
  fit_score: number | null;
  fit_score_basis: FitScoreBasis | null;
  fit_score_rationale: string | null;
  recommendation: 'apply' | 'maybe' | 'skip' | null;
  recommendation_reason: string | null;
  matched_skills: string[];
  missing_skills: string[];
  cv_suggestions: string[];
  salary_estimate: SalaryEstimate | null;
  created_at: string;
}

// ── Interview ─────────────────────────────────────────────────────────────────
export interface InterviewQuestion {
  id: string;
  question_text: string;
  type: 'behavioral' | 'technical' | 'role-specific';
  guidance: string;
  user_answer: string | null;
  score: number | null;    // 0–100
  feedback: string | null;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  job_analysis_id: string | null;
  questions: InterviewQuestion[];
  overall_score: number | null;
  job_analyses?: { job_title: string } | null;
  created_at: string;
}

// ── Career Roadmap ─────────────────────────────────────────────────────────────
export interface CareerPath {
  path_title: string;
  next_role: string;
  timeline_estimate: string;
  missing_skills: string[];
  recommended_projects: string[];
  experience_needed: string;
}

export interface CareerRoadmap {
  id: string;
  user_id: string;
  current_role: string;
  paths: CareerPath[];
  created_at: string;
}

// ── Cover Letter ──────────────────────────────────────────────────────────────
export interface CoverLetter {
  id: string;
  user_id: string;
  job_analysis_id: string | null;
  job_title: string;
  company: string | null;
  content: string;
  created_at: string;
}

// ── Application Tracker ───────────────────────────────────────────────────────
export type ApplicationStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';

export type OutcomeStage =
  | "no_response"
  | "recruiter_screen"
  | "phone_screen"
  | "technical"
  | "onsite"
  | "offer";

export interface Application {
  id: string;
  user_id: string;
  job_analysis_id: string | null;
  cover_letter_id: string | null;
  job_title: string;
  company: string | null;
  job_url: string | null;
  status: ApplicationStatus;
  applied_at: string | null;
  notes: string | null;
  outcome_stage_reached: OutcomeStage | null;
  outcome_reason: string | null;
  outcome_fit_score_at_apply: number | null;
  outcome_captured_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface AnalyseJobPayload {
  cvId: string;
  jobTitle: string;
  company?: string;
  jobRawText: string;
}

export interface StartInterviewPayload {
  jobAnalysisId: string;
}

export interface SubmitAnswerPayload {
  sessionId: string;
  questionId: string;
  answer: string;
}

export interface GenerateRoadmapPayload {
  currentRole: string;
  targetRole: string;
  cvId?: string;
}
