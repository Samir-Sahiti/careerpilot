# CareerPilot — Feature Audit & Review Brief

> Paste this file into a Claude.ai chat with Opus to get a product/feature review. It describes current state, known rough edges, and open questions — so the model can focus on suggesting what's missing rather than rediscovering what exists.

---

## 1. What the app is

AI-powered career management platform. A logged-in user uploads their CV once, then every other feature is personalised to that CV. Target user: active job-seekers, especially technical ones, who want AI help across the whole loop (CV → job search → application → interview → career planning).

**Monetisation / stage:** not stated — assume pre-revenue / MVP. Single-tenant Supabase.

**Core loop that already works:** upload CV → parse to structured JSON → paste a job listing → get fit score + salary + skill gaps → generate tailored cover letter → run a mock interview → track the application.

---

## 2. Tech context (for grounding suggestions)

- Next.js 16 App Router, React 19, TypeScript strict
- Supabase (Postgres + Auth + Storage) with RLS on every table
- Vercel AI SDK → Anthropic `claude-haiku-4-5` for all AI calls
- Zod for request + AI-output validation
- Rate limits per user: **10 AI calls/hour global**, plus `/cv/parse` 3/hr and `/cover-letter/generate` 5/hr
- All prompts centralised in `src/lib/ai/prompts.ts`
- 8 tables: `profiles`, `cvs`, `job_analyses`, `interview_sessions`, `career_roadmaps`, `cover_letters`, `applications`, `rate_limit_events`

---

## 3. The seven features — current state + rough edges

### 3.1 CV Hub
**What it does:** PDF/DOCX upload → text extraction (`pdf-parse` / `mammoth`) → Claude parses into `ParsedCvData` (role, seniority, years, skills[], education[], experience[], achievements[]). One CV is marked `is_active`; other features read from it.

**Rough edges / gaps:**
- Only **one active CV** at a time. No versioning, no per-role tailored variants ("CV for backend roles" vs "CV for platform roles").
- Skills are a flat `string[]` — no categorisation (language / framework / tool / soft), no proficiency.
- No "CV improvement" feature independent of a job (improvements only surface inside Job Analysis as `cv_suggestions`).
- No LinkedIn import or "build CV from scratch" flow — user must already have a PDF.
- PDF parsing relies on brittle DOMMatrix/DOMPoint polyfills for `pdfjs-dist` in Node.

### 3.2 Job Analyzer
**What it does:** user pastes `jobTitle` + optional `company` + raw job text. Returns `fit_score` 0–100, recommendation (`apply` / `maybe` / `skip`) with reason, `matched_skills`, `missing_skills`, 3–5 `cv_suggestions`, and a `salary_estimate` with factors + negotiation tip.

**Rough edges / gaps:**
- **Manual paste only.** No URL scraping, no LinkedIn/Indeed/Greenhouse integration, no browser extension.
- No **cross-job comparison** — can't diff two listings or rank a batch.
- Salary estimate is Claude-inferred from the listing; no real market data (Levels.fyi, Glassdoor).
- No signal on **application competition** (how hot is this role) or **company health** (layoffs, growth).
- No way to re-run analysis after editing the CV.

### 3.3 Interview Coach
**What it does:** generates 8–10 tailored questions (3 behavioural / 3–4 technical / 2–3 role-specific) for a given job analysis. User types answers; Claude streams feedback per answer using STAR evaluation for behavioural, plus a 0–100 score. Session has an `overall_score`.

**Rough edges / gaps:**
- **Text answers only** — no voice input, no speech-to-text, no pacing/filler-word analysis. Real interviews are spoken.
- No **follow-up questions** — it's a flat list, not an adaptive interviewer that probes weak answers.
- No **company-specific prep** (values, recent news, interviewer research).
- No **system-design** or **live-coding** modes distinct from Q&A.
- No retakes / progress-over-time tracking per question type.
- STAR framework is hard-coded in the prompt — no coverage of CAR, SOAR, or role-specific frameworks (case study, PM product sense, etc.).

### 3.4 Career Ladder
**What it does:** given the active CV, Claude returns 3 distinct career paths (e.g. IC / Management / Specialised Pivot), each with `next_role`, `timeline_estimate`, `missing_skills`, `recommended_projects`, `experience_needed`.

**Rough edges / gaps:**
- No **progress tracking** — user can't mark a project done or a skill learned. Roadmap is a one-shot document, not a living plan.
- No **resource links** — "learn Kubernetes" with no course/book/tutorial suggestions.
- No **market demand signal** — which of the 3 paths is hottest in the user's region/salary band?
- No **mentorship / role-model** layer (e.g. "people who made this jump came from X").
- Only 3 paths, always — not configurable.

### 3.5 Cover Letter Generator
**What it does:** `generateText()` call (not structured) with a strong system prompt banning corporate filler. Produces 3–4 paragraphs under 400 words from CV + job. Export to PDF via `window.print`.

**Rough edges / gaps:**
- **One draft, take it or leave it.** No regenerate-this-paragraph, no tone variants (formal / warm / confident), no length options.
- No **template library** or past-letter reuse.
- No **user edits persisted** — if the user rewrites it, changes don't save back.
- No per-company **memory** (if the user has applied to Stripe 3 times, nothing personalises).
- PDF export is browser print — fine but no DOCX / plaintext-email formats.

### 3.6 Application Tracker
**What it does:** CRUD on `applications` with status enum (`saved` / `applied` / `interviewing` / `offered` / `rejected`). Links optionally to a `job_analysis` and a `cover_letter`. Free-text notes field.

**Rough edges / gaps:**
- No **reminders or follow-ups** — "it's been 14 days since you applied, ping them?"
- No **interview date / time tracking** — the `interviewing` status is binary, not a schedule.
- No **offer tracking** — compensation breakdown, deadline to respond, competing offers.
- No **email/calendar integration** — user manually updates status.
- No **timeline view / pipeline velocity** (e.g. "you average 8 days from applied → interview").
- `notes` is one free-text blob — no structured contacts / recruiter / referral fields.

### 3.7 Analytics
**What it does:** single `AnalyticsClient.tsx` component. Likely counts across applications, interview scores, fit-score distribution. (Scope not fully inspected — ask if you want me to dig in.)

**Rough edges / gaps (suspected):**
- Probably descriptive ("you applied to 12 jobs") not prescriptive ("your fit scores drop for roles needing Go — learn Go or filter them out").
- No **cohort benchmarks** (how does the user compare to similar job-seekers?) — though that needs scale.
- No **funnel analysis** (applied → heard back → interview → offer rates).

---

## 4. Cross-cutting gaps worth discussing

- **No job-board ingestion.** Everything starts with the user pasting text. A browser extension or URL scraper would 10x usage frequency.
- **Single active CV = bottleneck** for anyone applying to diverse roles.
- **No networking layer.** Referrals drive most hires; the app doesn't touch this.
- **No negotiation coach.** Salary estimate exists at job-analysis time, but the offer stage (the moment money is actually won) has no support.
- **No feedback loop from outcomes.** The app has parsed CVs + job analyses + application outcomes. It never closes the loop — "users with your profile got hired for role X" or "your fit-score predictions vs actual interview-invite rate."
- **Model choice is fixed (Haiku).** No premium tier using Opus/Sonnet for deeper reasoning (interview critiques, roadmap quality).
- **Rate limits may be tight for power users.** 5 cover letters/hour limits someone batch-applying on a Saturday.
- **No shareable artifact.** User can't share a public portfolio / CV link / interview-readiness badge.
- **No mobile-first flow.** This is a dashboard app; real job-seekers are often browsing listings on phones.

---

## 5. Tensions / strategic questions to challenge

1. **7 features is a suite, not a wedge.** Which one is actually the reason a user opens the app on day 1? Everything else should funnel from that, and the current UI gives them equal weight on the sidebar.
2. **Job trackers are a commodity** (Huntr, Teal, Simplify all exist). What's the defensible layer here — the AI quality, the CV→interview→analytics loop, or something else?
3. **AI cost vs value per feature.** Cover-letter generation is arguably lowest-leverage (LLMs have commoditised it); interview prep with real feedback is probably highest. Is resource allocation reflecting that?
4. **Who pays?** B2C job-seekers are a notoriously bad market (short use window, low willingness-to-pay). Is there a B2B angle — bootcamps, career coaches, university career services — that the current architecture could serve?
5. **Data moat.** Every user generates parsed CV + job + outcome data. That's a training set / benchmarking goldmine that's currently not used for anything. Is that a v2 feature or a north star?

---

## 6. What I want from this review

Please evaluate:

1. **Feature prioritisation** — if I can only ship 2 new features in the next month, which of the gaps above (or new ones you'd add) have the best impact/effort ratio?
2. **The wedge question** — which of the 7 existing features should be the hero / marketing front-door, and why? What would you cut or demote?
3. **Moat / differentiation** — concrete suggestions for a feature that commodity trackers (Huntr, Teal) structurally can't copy.
4. **The outcome-feedback loop** — specific, implementable ways to use application outcomes to improve future AI suggestions.
5. **Anything I'm missing** — feel free to propose features I haven't listed. Bias toward ideas that use the unique data the app already has (parsed CV + job text + interview performance + application outcomes) rather than bolt-on LLM features anyone could add.

Keep suggestions grounded: each idea should name a specific user action, the data it relies on, and why it's harder to copy than "add an AI button."
