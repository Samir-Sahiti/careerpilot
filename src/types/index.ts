// ─────────────────────────────────────────────────────────────────────────────
// CareerPilot – shared TypeScript interfaces
// ─────────────────────────────────────────────────────────────────────────────

// ── User / Auth ──────────────────────────────────────────────────────────────

export interface UserProfile {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
}

// ── CV ───────────────────────────────────────────────────────────────────────

export interface CV {
    id: string;
    userId: string;
    fileName: string;
    fileUrl: string;
    parsedText: string | null;
    uploadedAt: string;
}

// ── Job Analysis ─────────────────────────────────────────────────────────────

export interface JobListing {
    id: string;
    title: string;
    company: string | null;
    rawText: string;
    createdAt: string;
}

export interface JobFitResult {
    jobId: string;
    cvId: string;
    fitScore: number; // 0–100
    matchedSkills: string[];
    missingSkills: string[];
    cvSuggestions: string[];
    createdAt: string;
}

// ── Interview ─────────────────────────────────────────────────────────────────

export interface InterviewSession {
    id: string;
    userId: string;
    jobId: string;
    questions: InterviewQuestion[];
    createdAt: string;
}

export interface InterviewQuestion {
    id: string;
    sessionId: string;
    question: string;
    userAnswer: string | null;
    score: number | null; // 0–10
    feedback: string | null;
}

// ── Career Ladder ─────────────────────────────────────────────────────────────

export interface CareerStep {
    id: string;
    title: string;
    description: string;
    skillsToLearn: string[];
    projectsToBuild: string[];
    estimatedMonths: number;
}

export interface CareerLadder {
    id: string;
    userId: string;
    currentRole: string;
    targetRole: string;
    steps: CareerStep[];
    createdAt: string;
}
