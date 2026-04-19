import { OutcomeHistoryItem, ParsedCvData } from "@/types";

// ── CV Parsing ────────────────────────────────────────────────────────────────
export function buildCvParsePrompt(extractedText: string): string {
  return `Extract structured profile data from this CV / Resume:\n\n${extractedText}`;
}

// ── Job Analysis ──────────────────────────────────────────────────────────────
export function buildJobAnalysisPrompt(
  cv: ParsedCvData,
  jobTitle: string,
  company: string | undefined,
  jobRawText: string,
  userHistory?: OutcomeHistoryItem[]
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

Use this fit_score rubric strictly. Pick the band the candidate fits, then adjust ±5 within it.

  90–100  Meets every stated requirement + most preferred. Seniority match. Direct domain experience.
  75–89   Meets all hard requirements. Missing 1–2 preferred. Seniority match or one level off.
  60–74   Meets most hard requirements. Missing 1 critical hard requirement OR seniority off by one level.
  40–59   Plausible stretch. Missing 2+ hard requirements or mismatched seniority by 2 levels.
  20–39   Significant gaps. Would likely fail a resume screen.
  0–19    Wrong role family or wrong seniority tier entirely.

Before picking a band, list the hard requirements in the listing (as you understand them) and check them off against the candidate's skills and experience. Include this checklist in your internal reasoning but do NOT include it in the output.
${userHistory && userHistory.length >= 3
  ? `\n---\n\nCALIBRATION — This candidate's own outcome history (use to recalibrate your score):\n${userHistory.map((h) => `- Fit score ${h.fit_score_at_application} for "${h.job_title}"${h.company ? ` at ${h.company}` : ""} → furthest stage reached: ${h.outcome_stage_reached}${h.outcome_reason ? ` ("${h.outcome_reason}")` : ""}`).join("\n")}\n\nIf the historical data shows the AI was systematically over- or under-predicting (e.g. scores of 70+ that got no response), adjust this new score accordingly. Do not inflate or deflate beyond what the rubric bands justify.\n`
  : ""}
Provide:
1. fit_score (0–100 integer) — use the rubric above, do not inflate
2. fit_score_basis: one of 'explicit' | 'inferred' | 'speculative'
   - 'explicit': the listing clearly states requirements and the candidate explicitly matches/misses them
   - 'inferred': seniority, scope, or key requirements had to be inferred from context (titles, company stage, etc.)
   - 'speculative': significant ambiguity in the listing or the candidate profile — score has lower confidence
3. fit_score_rationale: 1–2 sentences explaining what the score is based on (e.g. "Matched 7/9 listed skills. Seniority inferred from years of experience — listing doesn't state level.")
4. recommendation: 'apply' / 'maybe' / 'skip' — honest assessment
3. recommendation_reason: 1–2 candid sentences
4. matched_skills: candidate skills that directly match the role
5. missing_skills: required skills the candidate lacks
6. cv_suggestions: 3–5 specific, actionable improvements (e.g. "Add Docker to skills — the role lists it as required")
7. salary_estimate: an object with these exact fields:
   - shown_in_listing: true if the listing explicitly states a salary range or number, false otherwise
   - If shown_in_listing is true: extract currency, low, mid (midpoint), and high verbatim from the listing. Do not adjust or estimate — pass through what the listing says.
   - If shown_in_listing is false: set guidance to a 1–2 sentence message telling the candidate where to research comp for this role (e.g. Levels.fyi for tech, Glassdoor for broader; mention any salary-transparency laws that may apply based on location signals in the listing). Do NOT invent numbers.
   - negotiation_tip: 1–2 sentences on the candidate's best leverage points given their matched skills (always include regardless of shown_in_listing)`;
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
  const starInstruction =
    type === "behavioral"
      ? `\nSTAR COVERAGE: Also return star_coverage with four booleans (situation, task, action, result) indicating whether the candidate's answer addressed each STAR component.`
      : "";

  return `You are a senior hiring manager conducting a mock interview.
The candidate is answering a ${type} interview question for the role of ${jobTitle}${company ? ` at ${company}` : ""}.

CANDIDATE BACKGROUND: ${cv.current_role}, ${cv.years_of_experience} years experience.

QUESTION: "${question}"

Evaluate the candidate's answer and return a structured assessment:
- feedback: 2–4 sentences of direct, constructive overall evaluation. Be honest — a score of 60 means serious improvement needed; 85+ means excellent.
- strengths: 1–3 specific things the candidate did well.
- improvements: 1–3 specific, actionable things to improve.
- score: integer 0–100.${starInstruction}`;
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

// ── Follow-up Email ───────────────────────────────────────────────────────────
export function buildFollowUpEmailPrompt(
  jobTitle: string,
  company: string | undefined,
  appliedAt: string,
  cvRole: string
): string {
  const daysSince = Math.round((Date.now() - new Date(appliedAt).getTime()) / (1000 * 60 * 60 * 24));
  return `Write a short, polite follow-up message for a job application.

The candidate applied for: ${jobTitle}${company ? ` at ${company}` : ""}
Days since applying: ${daysSince}
Candidate's current role: ${cvRole}

Requirements:
- Under 100 words
- Professional but warm tone
- Reference the role and approximately when they applied
- Ask politely about the status of their application
- Do NOT use: "I hope this email finds you well", "circle back", "touch base", "leverage", or other clichés
- Output only the message body — no subject line, no salutation, no sign-off
- Write it so the candidate can paste it into an email or LinkedIn message with minimal editing`;
}

// ── CV Tailoring ──────────────────────────────────────────────────────────────
export function buildCvTailorPrompt(
  cv: ParsedCvData,
  jobTitle: string,
  company: string | undefined,
  jobRawText: string,
  matchedSkills: string[],
  missingSkills: string[]
): string {
  return `You are an expert CV writer and career coach.

A candidate wants to tailor their CV for a specific job application.

JOB TITLE: ${jobTitle}
${company ? `COMPANY: ${company}` : ""}

JOB DESCRIPTION:
${jobRawText}

CANDIDATE'S CURRENT CV:
Current Role: ${cv.current_role}
Seniority: ${cv.seniority_level}
Years of Experience: ${cv.years_of_experience}
Skills: ${cv.skills.join(", ")}
Experience:
${cv.experience.map((e) => `- ${e.title} at ${e.company} (${e.duration}): ${e.summary}`).join("\n")}
Education:
${cv.education.map((e) => `- ${e.degree} at ${e.institution}${e.year ? ` (${e.year})` : ""}`).join("\n")}

MATCHED SKILLS: ${matchedSkills.join(", ") || "none identified"}
MISSING SKILLS: ${missingSkills.join(", ") || "none"}

Tailor this candidate's CV for the job above. Your output:
1. skills: Reordered skills list — matched/relevant skills first, irrelevant ones last. Do not add skills the candidate doesn't have.
2. experience: Rewritten experience bullets emphasising work relevant to this role. Reorder entries to put the most relevant experience first. Do NOT invent or exaggerate — only reframe what's there.
3. education: Return as-is (no changes usually needed).
4. summary: One optional 2-sentence professional summary targeting this specific role. Only include if it adds value.
5. tailoring_notes: 3-5 bullet points explaining what you changed and why, so the candidate understands the strategy.

Be honest: if the candidate is a weak match, say so in tailoring_notes — don't over-promise.`;
}

// ── Interview Next Turn ───────────────────────────────────────────────────────
export function buildInterviewNextTurnPrompt(
  cv: ParsedCvData,
  jobTitle: string,
  company: string | undefined,
  parentQuestionCount: number,
  maxParentQuestions: number,
  question: string,
  answer: string,
  questionType: string
): string {
  return `You are a senior interviewer conducting a mock interview.

ROLE: ${jobTitle}${company ? ` at ${company}` : ""}
CANDIDATE: ${cv.current_role}, ${cv.years_of_experience} years experience

Current parent question count: ${parentQuestionCount} of ${maxParentQuestions} main questions asked.
Question just asked (type: ${questionType}): "${question}"
Candidate's answer: "${answer}"

Decide your next move:
- "follow_up": The answer was vague, incomplete, or left out a key detail worth probing. Generate a sharp follow-up that would be asked in a real interview.
- "next_question": The answer was reasonably complete. Move to the next main question. Generate it (behavioral/technical/role-specific, appropriate for their background).
- "end": We have reached or exceeded ${maxParentQuestions} parent questions AND the current answer is complete. End the session.

Rules:
- Only choose "follow_up" if the answer genuinely warrants it — don't probe just to probe.
- Follow-ups don't count toward the ${maxParentQuestions} parent question total.
- If parentQuestionCount >= ${maxParentQuestions}, only choose "follow_up" if critical, otherwise choose "end".
- For "next_question": vary the question type from the previous one if possible.
- text: the exact question or closing statement to show the user.
- reasoning: 1 sentence explaining your decision (internal only, not shown to user).
- question_type: only include for "next_question" or "follow_up" actions.`;
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

// ── Rejection Post-Mortem (T2-3) ──────────────────────────────────────────────
export function buildRejectionPostMortemPrompt(
  jobTitle: string,
  company: string | undefined,
  fitScore: number | null,
  matchedSkills: string[],
  missingSkills: string[],
  stageReached: string,
  outcomeReason: string | undefined
): string {
  return `You are a career coach analyzing why a job application was unsuccessful.

REJECTED APPLICATION:
Role: ${jobTitle}${company ? ` at ${company}` : ""}
Fit score at application: ${fitScore ?? "unknown"}/100
Stage reached: ${stageReached}
${outcomeReason ? `Candidate's note: "${outcomeReason}"` : ""}

MATCHED SKILLS: ${matchedSkills.join(", ") || "none"}
MISSING SKILLS: ${missingSkills.join(", ") || "none identified"}

Based on the fit score, the missing skills, and the stage reached, identify the most likely root cause of this rejection and give actionable, concrete advice.

Return:
1. likely_gap: The single most likely gap that caused this rejection. Be specific — name the actual skill, experience type, or level mismatch. 1–2 sentences.
2. similar_profiles_action: What candidates with a similar profile typically do after this kind of rejection to fix the gap. 1–2 concrete sentences.
3. roadmap_update_suggestion: A specific skill or project to add to their career roadmap to address this gap. 1 sentence — name the thing.`;
}
