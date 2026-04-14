import { ParsedCvData } from "@/types";

// ── CV Parsing ────────────────────────────────────────────────────────────────
export function buildCvParsePrompt(extractedText: string): string {
  return `Extract structured profile data from this CV / Resume:\n\n${extractedText}`;
}

// ── Job Analysis ──────────────────────────────────────────────────────────────
export function buildJobAnalysisPrompt(
  cv: ParsedCvData,
  jobTitle: string,
  company: string | undefined,
  jobRawText: string
): string {
  return `You are an expert technical recruiter and career coach.

A candidate is applying for:
JOB TITLE: ${jobTitle}
${company ? `COMPANY: ${company}` : ""}

JOB DESCRIPTION:
${jobRawText}

---

CANDIDATE PROFILE:
Current Role: ${cv.current_role}
Seniority: ${cv.seniority_level}
Years of Experience: ${cv.years_of_experience}
Skills: ${cv.skills.join(", ")}
Experience:
${cv.experience.map((e) => `- ${e.title} at ${e.company} (${e.duration}): ${e.summary}`).join("\n")}

---

Provide:
1. fit_score (0–100 integer) — genuine match quality, do not inflate
2. recommendation: 'apply' / 'maybe' / 'skip' — honest assessment
3. recommendation_reason: 1–2 candid sentences
4. matched_skills: candidate skills that directly match the role
5. missing_skills: required skills the candidate lacks
6. cv_suggestions: 3–5 specific, actionable improvements (e.g. "Add Docker to skills — the role lists it as required")
7. salary_estimate: a realistic salary range for this role in the likely market. Be conservative and honest.
   - Infer currency and location from the job listing (default to USD if unclear)
   - low/mid/high should reflect real market rates for the seniority level inferred from the listing
   - factors: list 3–5 key things influencing the range (e.g. "Remote-friendly", "Series B startup", "Requires 5+ years")
   - negotiation_tip: 1–2 sentences on the candidate's best leverage points given their matched skills`;
}

// ── Interview Generation ──────────────────────────────────────────────────────
export function buildInterviewGenerationPrompt(
  cv: ParsedCvData,
  jobTitle: string,
  companyName: string | undefined
): string {
  return `You are an expert technical interviewer and career coach.

I am preparing for an interview for the following role:
JOB TITLE: ${jobTitle}
${companyName ? `COMPANY: ${companyName}` : ""}

Here is my professional profile (parsed from my CV):
Current Role: ${cv.current_role}
Seniority: ${cv.seniority_level}
Years of Experience: ${cv.years_of_experience}
Skills: ${cv.skills.join(", ")}
Experience Summary: ${cv.experience.map((e) => `${e.title} at ${e.company}`).join(" | ")}

Please design a tailored mock interview containing exactly 8–10 questions. The distribution should ideally be:
- 3 behavioral questions (focused on scenarios using the STAR method format).
- 3–4 technical questions testing core competencies relevant to the role.
- 2–3 role-specific questions exploring how I would handle situations unique to this role/industry.

Critically: If there is a mismatch between my skills and the role requirements, include questions about how my existing or transferrable skills apply (e.g., if my CV shows React but the role is Vue, ask about adapting between frontend frameworks). Make the questions appropriately challenging for my seniority level (${cv.seniority_level}).

For each question, provide "guidance": 1–2 sentences explaining what a "good" answer should cover or highlight from my specific background.`;
}

// ── Interview Feedback ────────────────────────────────────────────────────────
export function buildInterviewFeedbackSystem(
  cv: ParsedCvData,
  question: string,
  type: "behavioral" | "technical" | "role-specific",
  jobTitle: string,
  company: string | undefined
): string {
  let evaluationCriteria = `
You are evaluating the answer based on:
1. Relevance to the role of ${jobTitle} ${company ? `at ${company}` : ""}
2. The candidate's background (${cv.current_role}, ${cv.years_of_experience} years exp)`;

  if (type === "behavioral") {
    evaluationCriteria += `
3. **STAR Method Framework**: The answer MUST follow the STAR format (Situation, Task, Action, Result).
Explicitly call out whether they successfully hit all 4 points, or what they missed.`;
  }

  return `You are a senior hiring manager conducting a mock interview.
The candidate is answering a **${type}** interview question.

QUESTION: "${question}"

${evaluationCriteria}

Provide constructive, directly actionable feedback. Be professional but honest. A score of 60 means they need serious improvement; a score of 85+ means an excellent answer.

You MUST format your output EXACTLY like this using Markdown:
**Feedback:**
(2-4 sentences evaluating their answer overall)

**Strengths:**
- (Bullet point 1)
- (Bullet point 2)

**Improvements:**
- (Bullet point 1)
- (Bullet point 2)

[SCORE: XX]
(Where XX is an integer between 0 and 100 representing their score. EXACTLY this format at the very end).`;
}

// ── Cover Letter ──────────────────────────────────────────────────────────────
export const COVER_LETTER_SYSTEM_PROMPT = `You are an expert cover letter writer who writes compelling, human-sounding letters.
Your letters are direct, specific, and concise — never generic or padded.
Never use: "I am passionate about", "I am a hard worker", "leverage", "synergy", "circle back", "going forward", or any other corporate filler.
Write in first person. Sound like a real, confident professional — not an AI.`;

export function buildCoverLetterPrompt(
  cv: ParsedCvData,
  jobTitle: string,
  company: string | undefined,
  jobRawText: string
): string {
  return `Write a professional cover letter for this candidate.

CANDIDATE CV:
${JSON.stringify(cv, null, 2)}

TARGET ROLE: ${jobTitle}
${company ? `COMPANY: ${company}` : ""}
${jobRawText ? `\nJOB DESCRIPTION:\n${jobRawText}` : ""}

INSTRUCTIONS:
- 3–4 paragraphs, under 400 words
- Opening paragraph: reference something specific about the role or company (if company is known) that genuinely interests this candidate given their background
- Middle paragraphs: reference 2–3 concrete experiences or skills from the CV that directly match the job requirements — be specific (mention actual companies, projects, technologies)
- Closing: short, confident call to action — no "I look forward to hearing from you at your earliest convenience"
- Do not mention salary
- Do not include any placeholder text like [Company Name] or [Your Name]
- Output only the letter text itself — no subject line, no headers`;
}

// ── Career Roadmap ────────────────────────────────────────────────────────────
export const CAREER_ROADMAP_SYSTEM_PROMPT = `You are an expert career advisor and technical recruiter.
Review the candidate's CV and generate 3 distinct, highly realistic career progression paths for them.

CRITICAL INSTRUCTIONS:
- Ground your advice in reality. If a candidate has 1-2 years of experience, do NOT suggest they will be a CTO, VP, or Principal Engineer within 2 years. Career steps must be incremental and plausible.
- Provide exactly 3 distinct paths (e.g. Individual Contributor Track, Management Track, Specialized Pivot Track).
- Analyze their current skills and identify EXACTLY what technical/soft skills are 'missing' for that next role step.
- Suggest concrete recommended projects to build those exact skills.`;

export function buildCareerRoadmapPrompt(cv: ParsedCvData): string {
  return `Here is the candidate's CV:
${JSON.stringify(cv, null, 2)}

Provide the structured career roadmap paths.`;
}
