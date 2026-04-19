# CareerPilot — Prioritized Issues

Each issue below is written as a standalone GitHub issue. Copy-paste the block under each heading into a new issue. Order matters: **ship Tier 0 before Tier 1 before Tier 2.** Within a tier, items can be parallelized.

**Legend**
- **Complexity:** S (≤1 day), M (2–5 days), L (1–2 weeks)
- **Depends on:** issues that must ship first

---

## Tier 0 — Trust & Foundation

Five issues. These don't add features — they make the features you already have actually trustworthy. Ship all of them before anything in Tier 1.

---

### [T0-1] Capture structured outcomes when application status changes

**Tier:** 0 · **Complexity:** M · **Depends on:** —

**Why**
Every application outcome is currently a black box. A user moves an application to `rejected` and we learn nothing. Without captured outcomes, fit scores can't be calibrated, rejection post-mortems can't be written, and every "AI insight" stays a guess. This single change is the prerequisite for the entire Tier 2 moat.

**What**
- Extend the `applications` table with structured outcome fields.
- When a user transitions an application to `interviewing`, `offered`, or `rejected`, show a small modal (2–3 questions max).
- Store responses. No LLM involved yet — just capture.

**Schema changes** (add to `schema.sql`):
```sql
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS outcome_stage_reached TEXT,
    -- 'no_response' | 'recruiter_screen' | 'phone_screen' | 'technical' | 'onsite' | 'offer'
  ADD COLUMN IF NOT EXISTS outcome_reason TEXT,
    -- free text, user-provided
  ADD COLUMN IF NOT EXISTS outcome_fit_score_at_application INTEGER,
    -- snapshot of job_analyses.fit_score when applied_at was set
  ADD COLUMN IF NOT EXISTS outcome_captured_at TIMESTAMPTZ;
```

**Acceptance criteria**
- [ ] Schema migration added (idempotent, safe re-run).
- [ ] When status changes to `interviewing`, modal asks: "What stage did you reach?" (dropdown) + "Anything notable?" (optional text).
- [ ] When status changes to `offered` or `rejected`, modal asks reason (optional) and confirms stage reached.
- [ ] When `applied_at` is first set, snapshot the linked `job_analyses.fit_score` into `outcome_fit_score_at_application`.
- [ ] Modal is skippable (user can dismiss) but re-promptable from the application detail view.
- [ ] All new fields exposed in the `Application` TypeScript type.

**Files to touch**
- `schema.sql`
- `src/types/index.ts`
- `src/components/applications/*`
- `src/app/api/applications/route.ts` (or wherever status updates happen)

---

### [T0-2] Add a calibration rubric to the fit-score prompt

**Tier:** 0 · **Complexity:** S · **Depends on:** —

**Why**
The current prompt says "fit_score (0–100 integer) — genuine match quality, do not inflate". That's not a rubric — it's a plea. Scores aren't comparable across users or across weeks because there's no fixed reference frame. A candidate with 3/10 required skills might get 45 one day and 62 the next.

**What**
Replace the single line with a banded rubric anchored to specific conditions. The model will cluster outputs and scores become meaningful over time.

**Proposed rubric to add in `buildJobAnalysisPrompt`:**

```
Use this fit_score rubric strictly. Pick the band the candidate fits, then adjust ±5 within it.

  90–100  Meets every stated requirement + most preferred. Seniority match. Direct domain experience.
  75–89   Meets all hard requirements. Missing 1–2 preferred. Seniority match or one level off.
  60–74   Meets most hard requirements. Missing 1 critical hard requirement OR seniority off by one level.
  40–59   Plausible stretch. Missing 2+ hard requirements or mismatched seniority by 2 levels.
  20–39   Significant gaps. Would likely fail a resume screen.
  0–19    Wrong role family or wrong seniority tier entirely.

Before picking a band, list the hard requirements in the listing (as you understand them) and
check them off against the candidate's skills and experience. Include this checklist in your
internal reasoning but do NOT include it in the output.
```

**Acceptance criteria**
- [ ] Rubric added to `buildJobAnalysisPrompt` in `src/lib/ai/prompts.ts`.
- [ ] Manually test 5 real job listings with 3 different CV profiles (junior, mid, staff). Confirm score distribution is sensible.
- [ ] Document the rubric in `CLAUDE.md` under "AI SDK Usage" so future prompt edits respect it.

**Files to touch**
- `src/lib/ai/prompts.ts`
- `CLAUDE.md`

---

### [T0-3] Kill the hallucinated salary estimate

**Tier:** 0 · **Complexity:** S (cut) / L (replace with real data) · **Depends on:** —

**Why**
The current prompt asks Claude to invent a salary range for every listing. Users anchor real negotiations on this number. If we're 20% low on a staff-level offer, we just cost the user $30k+. Generating fake numbers in high-stakes decisions is a product liability, not a feature.

**What — pick one of two approaches:**

**Option A (recommended for now — ship this week)**
Replace the generated number with actionable guidance. When the listing doesn't include salary, return a structured object pointing the user at sources:
```
salary_estimate: {
  shown_in_listing: false,
  guidance: "This listing hides comp. For similar roles, check Levels.fyi (tech) or Glassdoor (broader). Ask the recruiter for the band before the first interview — legally required in NYC, CA, WA, CO.",
  negotiation_tip: "...based on candidate's matched skills..."
}
```
When the listing does include salary, extract and pass through — don't estimate.

**Option B (do later)**
Integrate real data: Levels.fyi scrape for top-500 tech companies, PayScale/Glassdoor API for broader. Gated behind a "market data" toggle. Track as a separate follow-up issue.

**Acceptance criteria**
- [ ] Prompt updated to stop generating synthetic salary ranges when listing has no comp info.
- [ ] When listing contains salary, extract and pass through verbatim.
- [ ] UI shows either the real range (from listing) or the guidance message — never a generated number.
- [ ] Zod schema for `salary_estimate` updated to reflect the new shape.
- [ ] Migration note: existing `job_analyses.salary_estimate` rows remain valid (additive change).

**Files to touch**
- `src/lib/ai/prompts.ts`
- `src/lib/validation/schemas.ts`
- `src/types/index.ts`
- `src/components/jobs/*` (wherever salary is rendered)

---

### [T0-4] Migrate interview feedback from regex parsing to structured output

**Tier:** 0 · **Complexity:** M · **Depends on:** —

**Why**
The current feedback flow asks Claude to write markdown ending with `[SCORE: XX]`, then parses that with a regex. Your codebase already uses `generateObject` + Zod everywhere else. The markdown-with-magic-suffix approach is fragile (one malformed output and the score is `null`) and inconsistent with the rest of the codebase.

**What**
- Switch the feedback endpoint from `streamText` to `streamObject` (or keep streaming and parse delta-wise into a structured schema).
- Return `{ feedback, strengths[], improvements[], score }` as typed output.
- UI renders the structured parts — no more markdown-through-CSS.

**Schema to add in `src/lib/validation/schemas.ts`:**
```ts
export const InterviewFeedbackSchema = z.object({
  feedback: z.string().min(20),
  strengths: z.array(z.string()).min(1).max(5),
  improvements: z.array(z.string()).min(1).max(5),
  score: z.number().int().min(0).max(100),
  star_coverage: z.object({   // only for behavioral
    situation: z.boolean(),
    task: z.boolean(),
    action: z.boolean(),
    result: z.boolean(),
  }).optional(),
});
```

**Acceptance criteria**
- [ ] `buildInterviewFeedbackSystem` rewritten to produce structured output, not markdown.
- [ ] API route uses `streamObject` or equivalent.
- [ ] Client renders strengths/improvements as proper lists, not markdown-parsed bullets.
- [ ] STAR coverage shown as 4 checkboxes for behavioral questions only.
- [ ] Remove any `[SCORE: XX]` regex from the codebase.

**Files to touch**
- `src/lib/ai/prompts.ts`
- `src/lib/validation/schemas.ts`
- `src/app/api/interview/*`
- `src/components/interview/*`

---

### [T0-5] Show confidence tiers on AI outputs

**Tier:** 0 · **Complexity:** M · **Depends on:** T0-2, T0-3

**Why**
Every AI number in the app currently looks equally confident. A fit score that's based on 7 explicitly matched skills should look different from one that's based on inferring seniority from job titles. Users can't act on the AI because they can't tell when to trust it.

**What**
- Every AI output is annotated internally with how it was derived: `explicit`, `inferred`, `speculative`.
- UI renders a small confidence indicator next to each number (a dot, a tier label, or a tooltip).
- Starts with Job Analyzer (highest-stakes numbers) and expands outward.

**Schema additions (for `job_analyses`):**
```sql
ALTER TABLE job_analyses
  ADD COLUMN IF NOT EXISTS fit_score_basis TEXT,
    -- 'explicit' | 'inferred' | 'speculative'
  ADD COLUMN IF NOT EXISTS fit_score_rationale TEXT;
    -- 1-2 sentence explanation of what the score is based on
```

**Prompt change**
Extend the output schema to require `fit_score_basis` + `fit_score_rationale`. Example rationale: *"Matched 7/9 listed skills explicitly. Seniority inferred from years of experience, not stated titles. Salary band unknown — listing hides it."*

**Acceptance criteria**
- [ ] Schema migration adds the two new columns.
- [ ] Job analysis output includes basis + rationale.
- [ ] UI shows a tier badge next to fit score (e.g. Grounded / Inferred / Speculative).
- [ ] Hovering the badge shows the rationale.
- [ ] Pattern documented in `CLAUDE.md` for re-use in other features (interview scoring, career roadmap).

**Files to touch**
- `schema.sql`
- `src/lib/ai/prompts.ts`
- `src/lib/validation/schemas.ts`
- `src/types/index.ts`
- `src/components/jobs/*`
- `src/components/ui/ConfidenceBadge.tsx` (new)
- `CLAUDE.md`

---

## Tier 1 — Core Loop

Five issues that make the app actually useful between signup and first offer. Do these after Tier 0.

---

### [T1-1] Per-job CV tailoring

**Tier:** 1 · **Complexity:** L · **Depends on:** T0-2, T0-5

**Why**
"Single active CV" is not the real problem — most users only have one CV. The real gap is that the same CV goes to every application. You already have the parsed CV and the parsed job. The feature is: reshape one into a tailored version for the other.

**What**
On any job analysis, add a "Tailor CV for this role" button. AI returns:
- Reordered experience section (relevant roles first).
- Rewritten bullet points emphasizing matched skills, downplaying irrelevant ones.
- Reordered skills list (matched skills up top).
- Optional: one rewritten summary/headline targeted at the role.

Output is editable in a rich editor, then exports PDF + DOCX.

**New table:**
```sql
CREATE TABLE IF NOT EXISTS tailored_cvs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id            UUID        NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
  job_analysis_id  UUID        NOT NULL REFERENCES job_analyses(id) ON DELETE CASCADE,
  tailored_data    JSONB       NOT NULL,    -- mirrors ParsedCvData shape
  user_edits       JSONB,                    -- user overrides (persist them!)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Acceptance criteria**
- [ ] `POST /api/cv/tailor` accepts `job_analysis_id`, returns tailored JSON.
- [ ] UI shows side-by-side view: original vs tailored, with a diff toggle.
- [ ] User edits persist to `user_edits` column (unlike the current cover letter flow — don't repeat that mistake).
- [ ] PDF export via `window.print` with a clean print stylesheet.
- [ ] DOCX export via the `docx` skill — use the existing npm `docx` package or the skill SKILL.md.
- [ ] Rate-limited (2/hr per user, per-route).
- [ ] Linked tailored CV shows up on the associated application row.

**Files to touch**
- `schema.sql`
- `src/types/index.ts`
- `src/lib/ai/prompts.ts` (new prompt: `buildCvTailorPrompt`)
- `src/lib/validation/schemas.ts`
- `src/app/api/cv/tailor/route.ts` (new)
- `src/components/cv/TailoredCvView.tsx` (new)
- `src/lib/rateLimit.ts`

---

### [T1-2] Adaptive interview mode with follow-up questions

**Tier:** 1 · **Complexity:** L · **Depends on:** T0-4

**Why**
The current interview is a flat list of 10 questions. Real interviewers probe vague answers. If a candidate says "I led the migration", a real interviewer asks "led how? what did you actually own?" — and that's where weak answers get exposed. A flat list doesn't practice that.

**What**
Convert the interview flow into a turn-based conversation:
1. Claude generates a first question (existing logic).
2. User answers.
3. Claude decides: follow-up (if answer is vague/shallow) OR move to the next question.
4. Repeat until 8–10 main questions have been asked (follow-ups don't count toward the total).
5. Final feedback synthesizes across all answers including follow-ups.

**Prompt strategy**
- Use `generateObject` for the interviewer's next move: `{ action: 'follow_up' | 'next_question' | 'end', text: string, reasoning: string }`.
- Store full transcript in `interview_sessions.questions` (schema already JSONB).
- Add a `parent_question_id` to link follow-ups to their parent.

**Acceptance criteria**
- [ ] `POST /api/interview/next-turn` takes session + latest answer, returns next move.
- [ ] UI shows a chat-like interface, not a form.
- [ ] Follow-ups visually nested under their parent question.
- [ ] Session ends after 8–10 parent questions (configurable per session).
- [ ] Final overall score accounts for follow-up performance.
- [ ] `questions` JSONB shape extended to support `parent_id`, `is_follow_up`.
- [ ] Rate limit: counted as one request per session turn (not per question).

**Files to touch**
- `src/lib/ai/prompts.ts` (new: `buildInterviewNextTurnPrompt`)
- `src/lib/validation/schemas.ts`
- `src/app/api/interview/*`
- `src/components/interview/*`
- `src/types/index.ts`

---

### [T1-3] Application follow-up reminders

**Tier:** 1 · **Complexity:** M · **Depends on:** —

**Why**
The tracker is a filing cabinet, not a coach. Users open it when they add an application and never again. Adding time-based reminders turns it into a recurring surface — and "polite follow-up" is a concrete, valuable action the app can help with.

**What**
- For every application in `applied` status with `applied_at` ≥ 10 days ago and status still `applied`, show a "Follow up?" prompt.
- One-click generates a polite follow-up email/LinkedIn message (Claude-drafted, editable, copyable — do not send from the app).
- Track whether the user sent it (new boolean column).

**Schema:**
```sql
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_draft TEXT;
```

**Acceptance criteria**
- [ ] Dashboard widget: "3 applications need a follow-up" when applicable.
- [ ] One-click generate follow-up draft (reuses `cover-letter/generate` rate limit bucket? → separate bucket, 10/hr, these are short).
- [ ] Copy-to-clipboard + "I sent it" confirmation.
- [ ] Don't re-prompt after user marks as sent.
- [ ] Don't prompt for applications moved past `applied` status.

**Files to touch**
- `schema.sql`
- `src/app/api/applications/follow-up/route.ts` (new)
- `src/components/dashboard/FollowUpWidget.tsx` (new)
- `src/lib/ai/prompts.ts`
- `src/lib/rateLimit.ts`

---

### [T1-4] Company context panel on Job Analyzer

**Tier:** 1 · **Complexity:** M · **Depends on:** —

**Why**
The analyzer currently evaluates the job text in a vacuum. Same listing at "Stripe" and "unknown seed-stage startup" gets similar treatment. Company health (layoffs, growth, Glassdoor, funding stage) is a huge signal the app ignores.

**What**
When the user provides a company name, fetch and display:
- Glassdoor rating (if available, via scrape or third-party API).
- Recent news headlines (via web search — limit 3 most recent, last 90 days).
- Layoff mentions (layoffs.fyi check or news filter).
- Funding stage (Crunchbase lite or inferred from news).

Display as a compact side panel next to the fit score. If no company provided, panel is hidden.

**Acceptance criteria**
- [ ] New `/api/jobs/company-context` endpoint, takes `company` string, returns structured data.
- [ ] Cached server-side per (company, date) to avoid re-fetching the same company 10 times per user.
- [ ] Graceful degradation: if scrape fails, panel shows "Couldn't fetch context — [link to search]".
- [ ] Clear disclaimer: "Context is auto-fetched, may be inaccurate."
- [ ] Rate limited at IP level to prevent abuse of the scrape endpoint.

**Files to touch**
- `src/app/api/jobs/company-context/route.ts` (new)
- `src/components/jobs/CompanyContextPanel.tsx` (new)
- `src/lib/cache.ts` (new, or inline)

**Note**
Decide data source first. Options: (a) web search via your existing tooling, (b) Clearbit API (paid), (c) Glassdoor scrape (brittle). Recommend (a) + (b) combo.

---

### [T1-5] First-session activation — CV upload on signup, not in empty dashboard

**Tier:** 1 · **Complexity:** M · **Depends on:** —

**Why**
Current flow: user signs up → confirms email → lands in empty dashboard → has to discover CV upload in the sidebar. The highest-intent moment in the whole funnel is the 60 seconds after email confirmation, and we waste it with an empty state. Every feature in the app depends on a parsed CV, yet nothing pushes the user toward that action.

**What**
- After email confirmation callback, redirect to `/onboarding/cv` instead of `/dashboard`.
- `/onboarding/cv` is a single-purpose page: big drop-zone, one sentence of copy, skip button (small, below the fold).
- After successful parse, redirect to `/onboarding/first-analysis` — pre-filled tip: "Paste a job listing you're interested in. We'll tell you if it's worth your time."
- After first job analysis, unlock the full dashboard.
- Show a one-time welcome toast on dashboard: "You're set up. Try [Interview Coach] or [Career Ladder] next."

**Acceptance criteria**
- [ ] `src/app/auth/callback/route.ts` redirects new users to `/onboarding/cv`, returning users to `/dashboard`.
- [ ] `profiles` table gets `onboarding_completed_at TIMESTAMPTZ` column.
- [ ] Skip is possible but the dashboard shows a persistent banner until CV is uploaded.
- [ ] Onboarding pages are minimal — no sidebar, no distractions.
- [ ] First-time dashboard shows suggested next action, not 6 widgets.

**Files to touch**
- `schema.sql`
- `src/app/auth/callback/route.ts`
- `src/app/(auth)/onboarding/cv/page.tsx` (new)
- `src/app/(auth)/onboarding/first-analysis/page.tsx` (new)
- `src/app/(dashboard)/dashboard/page.tsx`

---

## Tier 2 — The Moat

Five issues. These use data only your app has (parsed CV × job analysis × interview × outcome), so they're structurally hard for Huntr/Teal/Simplify to copy. Do these after Tier 1.

---

### [T2-1] Outcome-conditioned fit scores (few-shot from user's own history)

**Tier:** 2 · **Complexity:** L · **Depends on:** T0-1, T0-5, T1-5

**Why**
Right now every fit score is generated fresh, with no memory of whether prior predictions were right. Once you have 5+ outcomes per user, you can feed the user's own history back into the prompt as calibration examples. This turns the AI from a guesser into a learner — and it's the thing no competitor without your parsed-CV-plus-outcome dataset can replicate.

**What**
When generating a new job analysis:
1. Query the user's last 10 applications with captured outcomes.
2. Pair each with its fit score at application time.
3. Inject as few-shot examples into the prompt.
4. The model is explicitly instructed: "For this user, a fit score of X historically led to outcome Y. Recalibrate this new score accordingly."

Also add a background job that, monthly, computes per-user calibration drift ("your fit scores over-predict by an average of 12 points") and surfaces it in Analytics.

**Acceptance criteria**
- [ ] Job analysis prompt accepts optional `user_history` context.
- [ ] Context built from last 10 `applications` joined to `job_analyses` with non-null `outcome_stage_reached`.
- [ ] Prompt length capped — if history is too long, keep the 5 most recent rejections + 5 most recent positive outcomes.
- [ ] New analytics widget: "Your AI calibration" showing over/under-prediction trend.
- [ ] Graceful fallback: if user has <3 outcomes, run without conditioning.

**Files to touch**
- `src/lib/ai/prompts.ts`
- `src/app/api/jobs/analyze/route.ts`
- `src/components/analytics/*`

---

### [T2-2] Interview performance trends by question type

**Tier:** 2 · **Complexity:** M · **Depends on:** T0-4

**Why**
You store every interview score by question type (`behavioral` / `technical` / `role-specific`) but never surface the trend. Users can't tell if they're improving at behaviorals and plateauing on technical — or vice versa. This is almost-free insight sitting in your JSONB.

**What**
- Add a "Progress" view inside Interview Coach: per-question-type score average over last N sessions.
- Trend lines (behavioral improving, technical flat, etc).
- Recommend focus: "Your technical scores haven't moved in 6 sessions. Try a targeted session."
- On session completion, surface: "You scored 82 on behaviorals (up from 65 six weeks ago)."

**Acceptance criteria**
- [ ] Dedicated query view: all sessions grouped by question type, sorted by `created_at`.
- [ ] Small line chart per question type (use existing `recharts` if available, or SVG).
- [ ] Copy generated server-side (not AI — just templated insights based on slope).
- [ ] Accessible from Interview Coach landing and from Analytics.

**Files to touch**
- `src/app/(dashboard)/interview/progress/page.tsx` (new)
- `src/components/interview/ProgressView.tsx` (new)
- `src/components/analytics/*`

---

### [T2-3] Rejection post-mortem

**Tier:** 2 · **Complexity:** M · **Depends on:** T0-1, T0-5

**Why**
When a user marks an application `rejected`, we have everything needed for a learning moment — fit score at time of application, matched vs missing skills, stage reached — and we do nothing with it. A 30-second post-mortem after rejection closes the most valuable loop in the app: failure → insight → updated plan.

**What**
When status changes to `rejected` and the outcome modal is completed:
- Trigger a lightweight AI analysis: given this fit score, these missing skills, and this stage reached, what's the most likely gap?
- Show result as a short card: "Most likely gap: [specific missing skill]. Users rejected at [stage] with similar profiles often [specific action]."
- Offer: "Add this to your Career Ladder?" button → updates roadmap with this skill flagged as priority.

**Acceptance criteria**
- [ ] New `POST /api/applications/post-mortem` endpoint.
- [ ] Triggered automatically on rejection status + outcome capture.
- [ ] Output structured: `{ likely_gap, similar_profiles_action, roadmap_update_suggestion }`.
- [ ] User can dismiss or accept the roadmap update.
- [ ] Aggregated across all a user's rejections in Analytics: "Your top 3 rejection patterns."

**Files to touch**
- `src/app/api/applications/post-mortem/route.ts` (new)
- `src/lib/ai/prompts.ts`
- `src/components/applications/RejectionPostMortem.tsx` (new)
- `src/components/analytics/*`

---

### [T2-4] Rebuild Career Ladder as a living plan with CV-evolution tracking

**Tier:** 2 · **Complexity:** L · **Depends on:** T0-1

**Why**
The current Career Ladder is a one-shot document the user sees once and forgets. The parsed CV already changes over time (new upload = new skills, new experience). Linking these turns a dead PDF into a living plan: "You added Kubernetes since your last upload. You're now 40% through the Staff IC path."

**What**
Replace the current three-paths generator with a persistent plan:
- User picks one path at generation time (IC / Management / Specialized) — not three simultaneously.
- Each missing skill and recommended project becomes a tracked item with a status (`not_started` / `in_progress` / `done`).
- On every new CV upload, diff skills against the previous version. Auto-mark newly-added skills as `done` in the roadmap.
- Show a "Next step" card on the dashboard: the single highest-priority unchecked item.
- Add resource links (course / book / tutorial) per skill — Claude-suggested initially, editable.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS roadmap_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roadmap_id   UUID        NOT NULL REFERENCES career_roadmaps(id) ON DELETE CASCADE,
  item_type    TEXT        NOT NULL,  -- 'skill' | 'project' | 'experience'
  title        TEXT        NOT NULL,
  description  TEXT,
  resources    JSONB       DEFAULT '[]',  -- [{ title, url, type }]
  status       TEXT        NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  auto_completed_by_cv_id UUID REFERENCES cvs(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Acceptance criteria**
- [ ] User generates one path (not three) per roadmap.
- [ ] Roadmap items persist and can be individually marked done.
- [ ] New CV upload triggers skill diff → auto-complete any roadmap items where the missing skill now appears.
- [ ] Dashboard surfaces "Next step" card.
- [ ] Resource links per skill (start with AI-generated, allow user to edit/replace).
- [ ] Historical view: "6 weeks ago vs today" diff.

**Files to touch**
- `schema.sql`
- `src/lib/ai/prompts.ts`
- `src/app/api/career/*`
- `src/components/career/*`
- `src/components/dashboard/NextStepWidget.tsx` (new)
- `src/components/cv/*` (wire up the diff on upload)

---

### [T2-5] Aggregate insights: "users like you" benchmarking

**Tier:** 2 · **Complexity:** L · **Depends on:** T0-1, T2-1

**Why**
Once 100+ users have outcomes, you can compare an individual's predicted vs actual outcomes to the cohort. This is the feature the audit calls out ("users with your profile got hired for role X") and it's the single strongest retention hook you can build — because it's the thing users physically cannot get anywhere else.

**What**
- Define cohorts by (seniority, role family, years of experience bracket).
- For any user with ≥3 applications tracked, show anonymized aggregate: "Users in your cohort (staff-level backend, 6–9 yrs) have a 14% response rate on fit scores ≥ 75."
- Compare user's own rates to the cohort.
- Only activate once cohort has ≥20 users (privacy + statistical validity).

**Acceptance criteria**
- [ ] New materialized view or scheduled aggregate in the DB computing cohort stats weekly.
- [ ] Cohort assignment logic in code (not AI).
- [ ] UI shows benchmarks only when user's cohort has ≥20 members.
- [ ] All displayed stats are aggregate-only; no per-user data leaks.
- [ ] Privacy notice: users can opt out of contributing to aggregates (default: opted-in, disclosed at signup).

**Files to touch**
- `schema.sql` (materialized view or aggregate table)
- `src/app/api/analytics/cohort/route.ts` (new)
- `src/components/analytics/*`
- Privacy copy in signup + settings

---

## Design / UX

Four issues. These are independent of the tiers and can be shipped in parallel with Tier 0/1.

---

### [D-1] Landing page rebuild — lead with the trigger, not the feature grid

**Complexity:** M · **Depends on:** —

**Why**
Current landing is a seven-feature grid with equal weight. This sells to people already sold. Real users arrive at a career tool because of a specific trigger (got a rejection, saw a listing, got laid off, bombed an interview). The page should answer: "in the 60 seconds you're here, what should you try?"

**What**
- **New hero:** "Paste a job listing. Know in 30 seconds if it's worth your time." With an inline demo (text input + mock analysis) that works without login.
- **Below hero:** 3 concrete before/after scenarios ("I saw a listing at 10pm — should I apply?", "I got rejected — what went wrong?", "I have an interview Tuesday"). Each one links to a feature.
- **Demoted:** feature grid moves below the scenarios, not the first thing visible.
- **Social proof slot:** empty for now, but scaffolded ("N CVs analyzed this week" etc — wire up later).
- **Remove inline styles.** The whole page is full of `style={{ ... }}` mixed with Tailwind. Pick one. Recommend: convert all to Tailwind + CSS vars already defined in `globals.css`.

**Acceptance criteria**
- [ ] Hero has a working inline demo (Job Analyzer running unauthenticated — rate-limited to 1 request per IP per day).
- [ ] Three scenario cards replace the feature grid as the primary below-hero element.
- [ ] All `style={{ backgroundColor: ... }}` inline rules replaced with Tailwind classes or CSS variables.
- [ ] Mobile layout works (current design is desktop-first).
- [ ] Copy does not list all 7 features; it names 2–3 at most.

**Files to touch**
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/api/jobs/demo-analyze/route.ts` (new — unauth, heavily rate-limited)

---

### [D-2] Auth pages — OAuth, magic link, cleaner flow

**Complexity:** M · **Depends on:** —

**Why**
The signup form asks for 4 fields (display name, email, password, confirm password) with password rules. This is 2026 — OAuth with Google/GitHub eliminates 90% of that friction and matches what technical users expect. Email/password should be the fallback, not the default.

**What**
- **Primary:** Google + GitHub OAuth buttons above everything else.
- **Secondary:** Magic link (passwordless email) as the second option.
- **Tertiary:** Email + password, collapsed behind "or use a password".
- Display name becomes optional (pull from OAuth provider if available; default to email prefix).
- Remove "Confirm password" — this is a 2009 pattern; use a password-strength meter instead.
- "Forgot password" link on login (currently missing).

**Acceptance criteria**
- [ ] Google OAuth configured in Supabase + implemented on login/signup.
- [ ] GitHub OAuth configured in Supabase + implemented.
- [ ] Magic link flow works end-to-end (including email confirmation redirect).
- [ ] Password fallback preserved but demoted visually.
- [ ] `displayName` no longer required — optional field, defaults handled server-side.
- [ ] "Forgot password" link + reset flow implemented.
- [ ] Error messages are still generic (no "email not found" — preserve current security stance).

**Files to touch**
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx` (new)
- `src/app/auth/callback/route.ts`
- Supabase dashboard: OAuth providers + SMTP config

---

### [D-3] Sidebar IA — promote Job Analyzer, demote Cover Letter

**Complexity:** S · **Depends on:** —

**Why**
Current sidebar gives equal weight to all seven features. Job Analyzer is the hero / front-door. Cover Letter is commodity LLM output and arguably the lowest-leverage feature in the app. The sidebar is reinforcing the wrong hierarchy.

**What**
Reorganize sidebar into primary and secondary groups:

**Primary (top, always visible):**
- Dashboard
- Job Analyzer
- Applications
- Interview Coach

**Secondary (grouped under "Tools" or collapsed):**
- CV Hub (still accessible directly from onboarding banner when CV missing)
- Career Ladder
- Cover Letter
- Analytics

Cover Letter generation should also be **embedded inline inside the Job Analyzer flow** — after a job is analyzed, a small "Draft cover letter" button appears. No longer a top-level destination.

**Acceptance criteria**
- [ ] Sidebar restructured per above.
- [ ] Cover Letter appears as an action inside Job Analyzer, not as a nav item (remove from primary nav).
- [ ] Secondary group collapses on narrow screens.
- [ ] Existing routes continue to work (don't break old bookmarks).

**Files to touch**
- `src/components/layout/Sidebar.tsx`
- `src/components/jobs/*` (add inline Draft Cover Letter action)

---

### [D-4] Rebuild Analytics as a prescriptive dashboard — or fold into Dashboard

**Complexity:** M · **Depends on:** T0-1, T2-1

**Why**
Current Analytics is descriptive — counts, averages, bars. It's also the only file with hardcoded colors (`bg-[#111827]`) bypassing the theme system. Users don't come back for descriptive stats. They come back for prescriptive insight: what should I do next?

**What — two valid approaches, pick one:**

**Option A (recommended): rebuild as prescriptive insights page.**
Replace counts with statements:
- "Your fit scores drop below 60 for roles listing Go. Either learn Go (add to roadmap) or filter these out."
- "Your behavioral interview score climbed from 65 → 82 in 6 weeks. Strong improvement."
- "You average 9 days between applying and interview. That's 40% faster than last month."
- "Your AI calibration: fit scores have over-predicted by 12 points over last 10 outcomes."

Each insight is a templated server-side calculation, not AI (keeps cost low, keeps output deterministic).

**Option B: fold the good parts (funnel, interview history) into the Dashboard. Remove Analytics as a separate page.**

**Acceptance criteria**
- [ ] All hardcoded colors replaced with CSS variables (`var(--card-bg)` etc).
- [ ] Either: (A) replace `AnalyticsClient.tsx` with a prescriptive insights component, or (B) move key widgets into the dashboard and delete the page.
- [ ] Every number shown has a "so what" — either an insight line or it's removed.
- [ ] No AI calls on page load — all insights are DB-backed computations.

**Files to touch**
- `src/components/analytics/AnalyticsClient.tsx`
- `src/app/(dashboard)/analytics/page.tsx`
- Possibly `src/components/dashboard/*` (if Option B)

---

## Suggested ordering for the first sprint

Week 1–2 (Tier 0):
1. T0-1 (outcomes — unblocks Tier 2)
2. T0-2 (fit score rubric — quick win)
3. T0-3 (kill salary hallucination — liability fix)
4. T0-4 (structured interview feedback — code quality)
5. T0-5 (confidence tiers — UX)

Week 3–4 (Tier 1, pick 2):
- T1-1 (per-job CV tailoring) + T1-5 (activation flow) — these two together reshape the product.

Parallel (design, anytime):
- D-1, D-2, D-3

Tier 2 starts month 2.

---

*Generated by Claude Opus 4.7 from the CareerPilot audit conversation, April 2026.*
