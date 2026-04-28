# CareerOS — Feature Audit (Updated)

> Current state as of April 2026, reflecting all Tier 0, Tier 1, Tier 2, and Design/UX issues shipped, plus the CareerOS visual rebrand. Use this as a baseline for the next review cycle.

---

## 1. What the app is

AI-powered career management platform. A logged-in user uploads their CV once, then every feature is personalised to that profile. Target user: active job-seekers, especially technical ones, who want AI support across the whole loop — CV → job fit → application → interview → career planning — and whose outcomes feed back into better predictions over time.

**Core loop:** upload CV → parse to structured JSON → paste a job listing → get fit score + skill gaps + salary context → tailored CV → cover letter → mock interview → track application → capture outcome → calibrate future scores.

---

## 2. Tech context

- Next.js 16 App Router, React 19, TypeScript strict
- Supabase (Postgres + Auth + Storage) with RLS on every user-scoped table
- Vercel AI SDK → Anthropic `claude-haiku-4-5` for all AI calls
- Zod for request + AI-output validation
- Rate limits per user: **10 AI calls/hour global**, plus per-route caps (cv/parse 3/hr, cover-letter 5/hr, cv/tailor 2/hr, post-mortem 5/hr, follow-up 10/hr)
- All prompts centralised in `src/lib/ai/prompts.ts`
- 12 tables: `profiles`, `cvs`, `job_analyses`, `interview_sessions`, `career_roadmaps`, `roadmap_items`, `cover_letters`, `tailored_cvs`, `applications`, `rate_limit_events`, `demo_rate_limits`, `cohort_stats`

---

## 3. The seven features — current state

### 3.1 CV Hub
**What it does:** PDF/DOCX upload → text extraction → Claude parses into `ParsedCvData` (role, seniority, years, skills[], education[], experience[], achievements[]). One CV is marked `is_active`.

**Shipped improvements:**
- Per-job tailored CV (T1-1): AI reorders skills and rewrites bullets for each role. Side-by-side diff view, user edits persisted to `tailored_cvs.user_edits`.
- Onboarding activation (T1-5): new users land at `/onboarding/cv` after email confirmation, not an empty dashboard.

**Remaining gaps:**
- Skills are still a flat `string[]` — no categorisation or proficiency levels.
- No LinkedIn import or "build from scratch" flow.
- CV diff against roadmap items (auto-completing skills when a new CV is uploaded) — schema supports it (`auto_completed_by_cv_id`) but the diff logic is not yet wired in the CV upload route.

---

### 3.2 Job Analyzer
**What it does:** user pastes job title + optional company + raw listing text. Returns `fit_score` (0–100, with rubric), `fit_score_basis` (explicit/inferred/speculative), `fit_score_rationale`, recommendation, matched/missing skills, CV suggestions, and salary context.

**Shipped improvements:**
- **Calibrated fit scores (T2-1):** when the user has ≥3 captured outcomes, their last 10 applications (5 positives + 5 rejections) are injected as few-shot examples into the prompt. The model is explicitly asked to recalibrate based on whether prior predictions matched outcomes.
- **Fixed rubric (T0-2):** banded 0–19 / 20–39 / 40–59 / 60–74 / 75–89 / 90–100 with specific conditions per band.
- **Salary guidance not hallucination (T0-3):** if listing shows no salary, returns a guidance object pointing to research sources. If listing shows salary, extracts verbatim.
- **Confidence badge (T0-5):** `fit_score_basis` + `fit_score_rationale` shown inline with a hover tooltip.
- **Company context panel (T1-4):** fetches recent news, Glassdoor rating signals, layoff mentions when company is provided.
- **Cover Letter CTA:** inline "Generate Cover Letter" button on the job detail page — Cover Letter is no longer a top-level sidebar nav item.

**Remaining gaps:**
- Manual paste only — no URL scraping or browser extension.
- No cross-job comparison or batch ranking.

---

### 3.3 Interview Coach
**What it does:** generates 8–10 tailored questions (behavioral / technical / role-specific). Two modes: standard (flat list) and adaptive (AI decides follow-up vs next question based on answer quality). Structured feedback per answer (`feedback`, `strengths`, `improvements`, `score`, `star_coverage` for behavioral). Session `overall_score`.

**Shipped improvements:**
- **Structured feedback (T0-4):** switched from `streamText` + regex `[SCORE: XX]` parsing to `streamObject` with `InterviewFeedbackSchema`. Strengths and improvements render as proper lists; STAR coverage shown as 4 checkboxes for behavioral questions only.
- **Adaptive mode (T1-2):** `POST /api/interview/next-turn` returns `{ action: 'follow_up' | 'next_question' | 'end', text, reasoning }`. Follow-ups don't count toward the 8–10 parent question total.
- **Performance trends (T2-2):** `/interview/progress` page shows per-type score trend cards with sparklines and slope-based insights ("Behavioral improving — technical plateau since 6 sessions").

**Remaining gaps:**
- Text answers only — no voice input.
- No company-specific prep (values, news, interviewer research).
- No system-design or live-coding distinct modes.

---

### 3.4 Career Ladder
**What it does:** given the active CV, Claude returns 3 distinct career paths (IC / Management / Specialised Pivot), each with `next_role`, `timeline_estimate`, `missing_skills`, `recommended_projects`, `experience_needed`.

**Shipped improvements:**
- **Living roadmap (T2-4):** paths now generate individual `roadmap_items` rows (one per missing skill, one per recommended project). Items have status `not_started → in_progress → done`, toggled with a single click.
- **Progress bar:** visible on both the Career Ladder page and the dashboard `NextStepWidget`.
- **NextStepWidget (T2-4):** dashboard surfaces the single highest-priority unchecked item from the active roadmap.
- Schema supports `auto_completed_by_cv_id` for future CV-diff auto-completion.

**Remaining gaps:**
- Resource links per skill (courses, books) — schema has `resources JSONB` column on `roadmap_items` but the prompt doesn't yet populate it.
- Historical "6 weeks ago vs today" diff view.
- CV upload doesn't yet auto-complete roadmap items when a matching skill appears in the new CV.

---

### 3.5 Cover Letter Generator
**What it does:** `generateText()` with a strong system prompt banning corporate filler. 3–4 paragraphs, under 400 words. Export to PDF via `window.print`. Accessible from the job detail page CTA and from its own dedicated route.

**No new changes** — this feature was intentionally deprioritised. Cover Letter is demoted from primary sidebar to secondary "Tools" group and surfaced inline in the job analyzer flow.

**Remaining gaps:**
- One draft, no regenerate or tone variants.
- User edits not persisted (intentional known limitation).

---

### 3.6 Application Tracker
**What it does:** CRUD on `applications` with status enum. Links to job analysis and cover letter. Free-text notes with auto-save. Follow-up email drafts generated on demand.

**Shipped improvements:**
- **Outcome capture (T0-1):** when status transitions to `interviewing`, `offered`, or `rejected`, a modal asks stage reached and optional reason. `outcome_fit_score_at_apply` snapshots the linked analysis score.
- **Follow-up reminders (T1-3):** dashboard widget shows applications in `applied` status with `applied_at` ≥10 days ago and no `follow_up_sent_at`. One-click generates a draft, copy-to-clipboard, "I sent it" marks it done.
- **Rejection post-mortem (T2-3):** after a rejection outcome is captured, a card appears in the detail panel. On demand, calls `POST /api/applications/post-mortem` which returns `{ likely_gap, similar_profiles_action, roadmap_update_suggestion }`. "Add to Career Ladder" routes to `/career`.

**Remaining gaps:**
- No interview date/time scheduling.
- No offer tracking (compensation breakdown, competing offers).
- No email/calendar integration.

---

### 3.7 Analytics
**What it does:** prescriptive insights dashboard with templated server-side calculations.

**Shipped improvements:**
- **AI calibration widget (T2-1):** compares avg fit score on applications that got responses vs no-responses. Shows calibration drift with directional advice ("scores over-predict by ~12 pts — be more selective").
- **Rejection patterns (T2-3):** aggregates `missing_skills` from all rejected applications. Shows top 3 recurring gaps with a link to add them to the Career Ladder.
- **Interview score trends (T2-2):** linked to `/interview/progress` for per-type breakdown.
- **Cohort benchmarks (T2-5):** assigns users to a cohort by seniority × role family × experience bracket. Shows response rate and offer rate vs cohort average — only when cohort has ≥20 members (privacy threshold). Opt-out in Settings.
- **Theme-aware:** all hardcoded hex values replaced with CSS variables (`bg-[var(--card-bg)]` etc.) across the full codebase as part of the CareerOS rebrand.

**Remaining gaps:**
- `cohort_stats` table must be populated by a manual or scheduled aggregate job — not auto-computed.
- No funnel velocity ("you average 9 days from applied → interview").

---

## 4. Visual Rebrand — CareerOS

**Shipped (April 2026):**
- **Brand rename:** CareerPilot → CareerOS throughout all code, copy, metadata, and documentation.
- **Color system:** warm dark palette (`#0f0e0c` background, `#1a1916` cards, `#2d2a26` borders) replacing cold navy. Amber (`#f59e0b`) primary accent replacing blue (`#2563eb`). New CSS tokens: `--muted`, `--sidebar-bg`, `--sidebar-border`.
- **Typography:** Syne (headings, geometric/bold) + DM Sans (body) + DM Mono (data/stats), replacing Plus Jakarta Sans + Inter.
- **Contrast compliance:** all amber CTAs use `text-stone-900` (WCAG AA). No `text-white` on amber backgrounds.
- **Hardcoded hex eliminated:** all raw hex values in JSX replaced with CSS variable references. Light-mode override selectors in `globals.css` updated in lock-step.
- **Bug fix:** onboarding pages used undefined `var(--bg-base)` — corrected to `var(--background)`.

---

## 5. Auth & Onboarding

**Shipped improvements:**
- **OAuth (D-2):** Google and GitHub sign-in via `supabase.auth.signInWithOAuth`. Requires provider configuration in Supabase dashboard.
- **Magic link (D-2):** passwordless email sign-in via `supabase.auth.signInWithOtp`.
- **Simplified signup (D-2):** display name optional (defaults from OAuth provider), confirm-password removed, live password strength meter.
- **Forgot password (D-2):** new `/forgot-password` page using `resetPasswordForEmail`. Generic success message.
- **Activation flow (T1-5):** `auth/callback/route.ts` redirects new users to `/onboarding/cv`, returning users to `/dashboard`.

---

## 6. Landing Page & Navigation

**Shipped improvements (D-1, D-3):**
- **New hero (D-1):** "Paste a job listing. Know in 30 seconds if it's worth your time." Leads with the trigger, not a feature grid.
- **Inline demo (D-1):** unauthenticated users can paste a job listing and get a role breakdown (skills, seniority, red flags) without signing up. Rate-limited 1/IP/day via `demo_rate_limits` table.
- **Scenario cards (D-1):** three trigger-based cards (job listing, rejection, interview) replace the feature grid as primary hero content.
- **Sidebar restructure (D-3):** primary group (Dashboard, Job Analyzer, Applications, Interview Coach) always visible; "Tools" group (CV Hub, Career Ladder, Cover Letter, Analytics) collapsible. Equal-weight feature grid replaced.

---

## 7. Remaining strategic gaps

- **No job-board ingestion.** Everything starts with a paste. A browser extension or URL scraper would raise usage frequency significantly.
- **CV upload doesn't auto-complete roadmap items.** The schema and `auto_completed_by_cv_id` column are in place; the diff logic needs wiring in the CV parse route.
- **`cohort_stats` requires a scheduled job.** The table and API are built; benchmarks need a cron job (weekly) to compute and populate aggregate rows.
- **No voice input for interviews.** All answers are typed.
- **No offer negotiation coach.** Salary estimate exists at job-analysis time; the offer stage has no support.
- **No shareable artifacts.** No public portfolio link, interview-readiness badge, or CV share URL.
- **Resource links on roadmap items.** The `resources JSONB` column exists on `roadmap_items` but the prompt doesn't yet return course/book suggestions.
- **Model is fixed (Haiku).** No premium tier using Sonnet/Opus for deeper reasoning.
