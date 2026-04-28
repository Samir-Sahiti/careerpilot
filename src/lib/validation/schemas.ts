import { z } from "zod";

// ── CV ────────────────────────────────────────────────────────────────────────
export const parseCvSchema = z.object({
  cvId: z.string().uuid("cvId must be a valid UUID"),
});

// ── Job Analysis ──────────────────────────────────────────────────────────────
export const analyzeJobSchema = z.object({
  cvId: z.string().uuid("cvId must be a valid UUID"),
  jobTitle: z.string().min(1, "jobTitle is required").max(200),
  company: z.string().max(200).optional(),
  jobRawText: z.string().min(10, "jobRawText is required").max(20000),
});

// ── Interview ─────────────────────────────────────────────────────────────────
export const generateInterviewSchema = z.object({
  jobTitle: z.string().min(1, "jobTitle is required").max(200),
  companyName: z.string().max(200).optional(),
  jobAnalysisId: z.string().uuid().optional(),
  mode: z.enum(["standard", "adaptive"]).optional().default("standard"),
});

export const interviewFeedbackSchema = z.object({
  prompt: z.string().min(1, "prompt (user answer) is required"),
  question: z.string().min(1, "question is required"),
  type: z.enum(["behavioral", "technical", "role-specific"]),
  jobTitle: z.string().min(1, "jobTitle is required"),
  company: z.string().optional(),
});

export const InterviewFeedbackOutputSchema = z.object({
  feedback: z.string().min(20),
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()).min(1),
  score: z.number().int().min(0).max(100),
  star_coverage: z
    .object({
      situation: z.boolean(),
      task: z.boolean(),
      action: z.boolean(),
      result: z.boolean(),
    })
    .optional(),
});

// ── Cover Letter ──────────────────────────────────────────────────────────────
export const generateCoverLetterSchema = z.object({
  jobTitle: z.string().min(1, "jobTitle is required").max(200),
  company: z.string().max(200).optional(),
  jobRawText: z.string().max(20000).optional(),
  jobAnalysisId: z.string().uuid().optional(),
});

// ── Career Roadmap ─────────────────────────────────────────────────────────────
export const generateRoadmapSchema = z.object({
  force: z.boolean().optional().default(false),
});

// ── Applications ──────────────────────────────────────────────────────────────
export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offered",
  "rejected",
] as const;

export const createApplicationSchema = z.object({
  job_title: z.string().min(1, "job_title is required").max(200),
  company: z.string().max(200).optional(),
  job_url: z.string().url("job_url must be a valid URL").optional().or(z.literal("")),
  status: z.enum(APPLICATION_STATUSES).optional().default("saved"),
  applied_at: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  job_analysis_id: z.string().uuid().optional().nullable(),
  cover_letter_id: z.string().uuid().optional().nullable(),
});

export const OUTCOME_STAGES = [
  "no_response",
  "recruiter_screen",
  "phone_screen",
  "technical",
  "onsite",
  "offer",
] as const;

// ── CV Tailoring ──────────────────────────────────────────────────────────────
export const tailorCvSchema = z.object({
  jobAnalysisId: z.string().uuid("jobAnalysisId must be a valid UUID"),
});

export const TailoredCvOutputSchema = z.object({
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string(),
    duration: z.string(),
    summary: z.string(),
  })),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string(),
    year: z.number().optional(),
  })),
  tailoring_notes: z.array(z.string()),
});

// ── Application Follow-up ─────────────────────────────────────────────────────
export const generateFollowUpSchema = z.object({
  applicationId: z.string().uuid("applicationId must be a valid UUID"),
});

export const markFollowUpSentSchema = z.object({
  applicationId: z.string().uuid("applicationId must be a valid UUID"),
});

// ── Company Context ───────────────────────────────────────────────────────────
export const companyContextSchema = z.object({
  company: z.string().min(1).max(200),
});

// ── Adaptive Interview ────────────────────────────────────────────────────────
export const interviewNextTurnSchema = z.object({
  sessionId: z.string().uuid("sessionId must be a valid UUID"),
  questionId: z.string(),
  answer: z.string().min(1, "answer is required"),
  parentQuestionCount: z.number().int().min(0),
});

export const InterviewNextTurnOutputSchema = z.object({
  action: z.enum(["follow_up", "next_question", "end"]),
  text: z.string(),
  reasoning: z.string(),
  question_type: z.enum(["behavioral", "technical", "role-specific"]).optional(),
});

export const patchApplicationSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().max(5000).optional().nullable(),
  applied_at: z.string().datetime().optional().nullable(),
  job_url: z.string().url().optional().nullable().or(z.literal("")),
  company: z.string().max(200).optional().nullable(),
  cover_letter_id: z.string().uuid().optional().nullable(),
  outcome_stage_reached: z.enum(OUTCOME_STAGES).optional().nullable(),
  outcome_reason: z.string().max(2000).optional().nullable(),
  outcome_fit_score_at_apply: z.number().int().min(0).max(100).optional().nullable(),
  outcome_captured_at: z.string().datetime().optional().nullable(),
  follow_up_sent_at: z.string().datetime().optional().nullable(),
  follow_up_draft: z.string().max(5000).optional().nullable(),
});
