# CareerOS

AI-powered career management platform. Seven core features: CV Hub, Job Analyzer, Interview Coach, Career Ladder, Cover Letter Generator, Application Tracker, Analytics.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5 (strict)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`), `tailwind-merge`, `clsx`
- **Database & Auth:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`) — PostgreSQL, Auth, Storage
- **AI:** Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) — model: `claude-haiku-4-5`
- **Data fetching:** TanStack React Query
- **Validation:** Zod (API request bodies + AI output schemas)
- **File parsing:** `pdf-parse` + `pdfjs-dist` (PDF), `mammoth` (DOCX)
- **UI:** `lucide-react` (icons), `sonner` (toasts), `react-dropzone` (uploads)
- **Dates:** `date-fns`
- **Theme:** `next-themes` (dark/light toggle, `attribute="class"`)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint (flat config, core-web-vitals + typescript)
npx vitest       # Run unit tests
npx prettier --write .  # Format code (run manually before committing)
npm run seed:taxonomy    # Seed/update skills_taxonomy from data/skills-taxonomy.json
npm run review:unknowns  # List top unresolved unknown skills (taxonomy maintenance)
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup, forgot-password pages
│   ├── (dashboard)/         # Protected pages: dashboard, cv, jobs, interview,
│   │                        #   career, cover-letter, applications, settings, analytics
│   │                        #   interview/progress (T2-2)
│   ├── api/
│   │   ├── account/
│   │   ├── analytics/cohort/        # T2-5: cohort benchmarking
│   │   ├── applications/
│   │   │   ├── [id]/
│   │   │   ├── follow-up/
│   │   │   └── post-mortem/         # T2-3: rejection post-mortem
│   │   ├── career/
│   │   │   ├── roadmap/
│   │   │   └── roadmap-items/       # T2-4: item status updates
│   │   ├── cover-letter/
│   │   ├── cv/
│   │   ├── interview/
│   │   └── jobs/
│   │       ├── analyze/
│   │       ├── company-context/
│   │       └── demo-analyze/        # D-1: unauthenticated landing demo
│   ├── auth/callback/       # Supabase OAuth callback (handles OAuth + recovery)
│   ├── layout.tsx
│   ├── page.tsx             # Landing page (redesigned D-1)
│   └── not-found.tsx
├── components/
│   ├── analytics/           # AnalyticsClient — prescriptive, theme-aware
│   ├── applications/        # Tracker + OutcomeModal + RejectionPostMortem (T2-3)
│   ├── career/              # RoadmapDisplay (living plan, T2-4) + AutoGenerateRoadmap
│   ├── cover-letter/
│   ├── cv/                  # Upload, parsing, TailoredCvView
│   ├── dashboard/           # Widgets incl. NextStepWidget (T2-4), FollowUpWidget
│   ├── interview/           # ActiveSession, ChatSession, ProgressView (T2-2)
│   ├── jobs/                # JobAnalyzerForm, FitScoreArc, CompanyContextPanel
│   ├── landing/             # LandingDemo (D-1 inline demo)
│   ├── layout/              # Sidebar (primary/tools groups, D-3), ThemeToggle
│   ├── settings/
│   └── ui/                  # Button, Card, Badge, Input, LoadingSpinner,
│                            #   EmptyState, ConfidenceBadge
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client (createBrowserClient)
│   │   ├── server.ts        # Server client + admin client (service role)
│   │   └── middleware.ts    # Session refresh helper
│   ├── ai/
│   │   └── prompts.ts       # All AI prompt builders (centralised)
│   ├── skills/              # Skill taxonomy layer (SG-1 through SG-7)
│   │   ├── normalizer.ts    # Deterministic 3-tier skill lookup (exact→alias→normalized)
│   │   ├── autoComplete.ts  # Roadmap item auto-completion after CV parse
│   │   ├── extractFromListing.ts  # Claude-constrained listing skill extraction
│   │   ├── index.ts         # Public export surface
│   │   └── __tests__/normalizer.test.ts
│   ├── pdf/
│   │   └── polyfills.ts     # DOMMatrix/DOMPoint/DOMRect stubs for pdfjs-dist
│   ├── validation/
│   │   └── schemas.ts       # Zod schemas for all API request bodies
│   ├── __tests__/
│   │   └── rateLimit.test.ts
│   ├── apiResponse.ts
│   ├── exportToPdf.ts
│   ├── logger.ts
│   └── rateLimit.ts         # Global + per-route AI rate limiting (fails CLOSED)
├── types/
│   └── index.ts             # All shared TypeScript interfaces
└── middleware.ts
```

Schema file at project root: `schema.sql` (consolidated — safe to run on fresh or existing databases).

Additional top-level paths:
- `data/skills-taxonomy.json` — canonical skill list (treat as code, ships in PRs)
- `scripts/seed-taxonomy.ts` — idempotent seed from JSON into DB
- `scripts/generate-taxonomy.ts` — one-time Claude-assisted taxonomy generation
- `scripts/review-unknowns.ts` — weekly maintenance: list unknown skills by frequency

## Key Patterns

### Supabase SSR — Three Client Types
1. **Browser client** (`lib/supabase/client.ts`): `createBrowserClient` — used in client components
2. **Server client** (`lib/supabase/server.ts`): `createServerClient` with cookie forwarding — used in server components and API routes
3. **Admin client** (`lib/supabase/server.ts`): uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS — used for storage ops, CV parsing, and the unauthenticated demo route

### Auth
`src/middleware.ts` refreshes sessions on every request. Redirects unauthenticated users away from dashboard routes and authenticated users away from auth routes. Dashboard layout double-checks with `getUser()`.

Auth pages support: Google OAuth, GitHub OAuth, magic link (passwordless), and email/password (collapsed fallback). OAuth requires providers to be enabled in the Supabase dashboard. The callback at `src/app/auth/callback/route.ts` handles code exchange and redirects new users to `/onboarding/cv`.

### AI SDK Usage
- **Structured output:** `generateObject()` with Zod schemas — CV parsing, job analysis, interview questions, career roadmaps, rejection post-mortems (T2-3), interview next-turn (T1-2)
- **Free-form:** `generateText()` — cover letters
- **Streaming:** `streamObject()` — interview feedback (structured, not markdown)
- All AI calls use `anthropic("claude-haiku-4-5")`
- All prompts are defined as exported functions in `src/lib/ai/prompts.ts`

### Fit-Score Rubric (do not change without updating this doc)
`buildJobAnalysisPrompt` uses a fixed banded rubric so scores are comparable across users and over time:
- **90–100** — meets every requirement + most preferred, seniority match, direct domain experience
- **75–89** — all hard reqs met, missing 1–2 preferred, seniority ±1
- **60–74** — most hard reqs met, missing 1 critical OR seniority off by one level
- **40–59** — plausible stretch, 2+ hard reqs missing or seniority off by 2 levels
- **20–39** — significant gaps, likely fails resume screen
- **0–19** — wrong role family or seniority tier entirely

Within the chosen band, adjust ±5 for nuance. Do not inflate.

The prompt also accepts an optional `userHistory: OutcomeHistoryItem[]` parameter (T2-1). When the user has ≥3 captured outcomes, their last 10 (split 5 positives / 5 rejections) are injected as few-shot calibration examples before the rubric.

**Skill Ground Truth (SG-6 — architectural change):** `buildJobAnalysisPrompt` now receives an optional `groundTruth: SkillGroundTruth | null` parameter. When populated, matched/missing skills are passed as deterministic inputs (not derived by Claude). Claude only produces the qualitative fields: fit_score, recommendation, cv_suggestions, salary_estimate. `matched_skills` and `missing_skills` in `job_analyses` are written from the deterministic computation, not from Claude's output.

### Skill Taxonomy (SG-1 through SG-7)

A normalized skill taxonomy replaces the ad-hoc `string[]` approach. This powers consistent fit scoring, roadmap auto-completion, and cohort comparisons.

**Taxonomy source of truth:** `data/skills-taxonomy.json` — committed to the repo, ships in PRs. Nine categories: `language`, `framework`, `database`, `cloud`, `devops`, `tool`, `concept`, `domain`, `soft`.

**Normalizer (`src/lib/skills/normalizer.ts`):** Deterministic 3-tier lookup:
1. Exact match on `canonical_name` (case-insensitive)
2. Exact match on any `alias` (case-insensitive)
3. Normalized match — strip punctuation, collapse whitespace, lowercase (`"react.js"` → `"reactjs"`)

Returns `NormalizationResult` with `canonical: CanonicalSkill | null` and `match_type`. O(1) per lookup via in-memory Map. Cache TTL: 10 minutes.

**Data flow after a CV parse:**
1. Normalize `parsed_data.skills` → upsert `cv_skills` junction table
2. Log unknowns to `unknown_skills` table
3. Auto-complete roadmap items whose `skill_id` appears in the new `cv_skills` (returns count, surfaced as toast)

**Data flow after a job analysis:**
1. Extract listing skills via constrained Claude call (`extractFromListing.ts`)
2. Normalize extracted skills → compute `matched ∩ cv`, `missing − cv` deterministically
3. Pass as `groundTruth` to `buildJobAnalysisPrompt`
4. Persist `job_analysis_skills` junction table
5. Log unknown listing skills

**Taxonomy maintenance loop (run weekly):**
```bash
npm run review:unknowns          # see top-N unresolved unknown skills
# edit data/skills-taxonomy.json
npm run seed:taxonomy            # upsert + mark resolved unknowns
```

**No RLS:** `skills_taxonomy` and `unknown_skills` are global/system tables accessed only via the admin client.

### Rate Limiting
Two-tier system tracked via `rate_limit_events` table:
- **Global:** 10 AI requests per hour per user
- **Per-route limits:**

| Route | Limit |
|-------|-------|
| `/api/cv/parse` | 3/hr |
| `/api/cover-letter/generate` | 5/hr |
| `/api/cv/tailor` | 2/hr |
| `/api/applications/follow-up` | 10/hr |
| `/api/applications/post-mortem` | 5/hr |

- Check runs before AI call; consumption recorded after success
- **Fails CLOSED** — denies on DB error (never allows on error)
- Returns HTTP 429 with `Retry-After: 3600` when exceeded
- The unauthenticated demo route (`/api/jobs/demo-analyze`) uses a separate IP-hash-based table (`demo_rate_limits`) with a 1-per-24-hour limit, enforced via the admin client.

### API Route Pattern
Every authenticated route: validate body with Zod (`schema.safeParse`) → authenticate with `supabase.auth.getUser()` → check rate limit → AI call → persist to DB → consume rate limit. All set `export const maxDuration = 60`.

Use helpers from `src/lib/apiResponse.ts`:
- `errorResponse(message, status?, headers?)` — `{ error: message }`
- `successResponse(data, status?)` — data as JSON
- `rateLimitResponse(message)` — 429 with Retry-After

Log all errors with `logger.error(message, context, error)` from `src/lib/logger.ts`.

### Request Body Validation
All API routes use Zod schemas from `src/lib/validation/schemas.ts`. Use `schema.safeParse(body)` and return 400 with `errors[0].message` on failure.

### Theme
`next-themes` with `attribute="class"`. Dark/light CSS variables in `globals.css` under `:root` (dark default) and `.light`. Toggle is in the Sidebar via `ThemeToggle`.

**Design tokens (dark default):**
- `--background: #0f0e0c` · `--card-bg: #1a1916` · `--border-subtle: #2d2a26`
- `--accent: #f59e0b` (amber) · `--accent-hover: #fbbf24`
- `--muted: #a8a29e` · `--sidebar-bg: #0c0b0a` · `--sidebar-border: #232220`

**Light overrides (`.light`):**
- `--background: #faf9f7` · `--card-bg: #ffffff` · `--border-subtle: #e7e5e4`
- `--accent: #d97706` · `--muted: #78716c`
- Sidebar stays dark even in light mode (uses `--sidebar-bg`/`--sidebar-border` directly)

**Typography:** `--font-heading` → Syne (weights 400–800), `--font-body` → DM Sans (weights 400–600), `--font-mono` → DM Mono (weights 400–500). All loaded via `next/font/google` in `layout.tsx`.

**Amber button contrast rule:** `bg-amber-500`/`bg-amber-400` buttons must use `text-stone-900` — never `text-white`. `#f59e0b` on white fails WCAG AA.

Always use CSS variables (`bg-[var(--card-bg)]`, `border-[var(--border-subtle)]`, etc.) — never hardcode hex values in components. The light-mode override system in `globals.css` (lines ~160+) uses CSS attribute selectors keyed to exact hex strings — if you change a hex in JSX, update the matching selector in that section too.

### Shared UI Components
Import from `@/components/ui`: `Button`, `Card`, `Badge`, `Input`, `LoadingSpinner`, `EmptyState`, `ConfidenceBadge`.

### Path Alias
`@/*` maps to `./src/*` (tsconfig paths).

### Sidebar Navigation Structure (D-3)
Primary group (always visible): Dashboard, Job Analyzer, Applications, Interview Coach.
Secondary "Tools" group (collapsible): CV Hub, Career Ladder, Cover Letter, Analytics.
Cover Letter is also accessible as an inline CTA on the job detail page (`/jobs/[id]`).

## Database

PostgreSQL via Supabase. Twelve tables, all with Row-Level Security (except `cohort_stats` which is aggregate-only with no `user_id`):

| Table | Purpose |
|-------|---------|
| `profiles` | User metadata (auto-created via trigger on signup) |
| `cvs` | Uploaded CVs with parsed text and structured data (JSONB) |
| `job_analyses` | Job fit scores, confidence basis/rationale, skill matches, salary |
| `interview_sessions` | Mock interview questions, answers, scores (JSONB) |
| `career_roadmaps` | AI-generated career progression paths (JSONB) |
| `roadmap_items` | Individual tracked skill/project items within a roadmap (T2-4) |
| `cover_letters` | Generated cover letters |
| `tailored_cvs` | Per-job AI-tailored CV versions with user edits |
| `applications` | Application tracking with status enum + outcome fields |
| `rate_limit_events` | Per-user AI request tracking |
| `demo_rate_limits` | IP-hash-based throttle for the unauthenticated landing demo |
| `cohort_stats` | Weekly aggregate benchmarks by seniority × role family × experience |

- **Storage bucket:** `cvs` (private, RLS scoped to `{user_id}/{filename}`)
- **Enum:** `application_status` — `saved`, `applied`, `interviewing`, `offered`, `rejected`

### Key JSONB Shapes

**`applications.outcome_*` columns** — populated via OutcomeModal when status transitions to `interviewing`, `offered`, or `rejected`:
- `outcome_stage_reached`: `'no_response' | 'recruiter_screen' | 'phone_screen' | 'technical' | 'onsite' | 'offer'`
- `outcome_reason`: free text
- `outcome_fit_score_at_apply`: snapshot of `job_analyses.fit_score` at time of application
- `outcome_captured_at`: timestamp

**`roadmap_items.status`**: `'not_started' | 'in_progress' | 'done'`
**`roadmap_items.item_type`**: `'skill' | 'project' | 'experience'`

## Environment Variables

All required in `.env.local`:

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Server only | Anthropic Claude API key |

Code has `|| "placeholder"` fallbacks to avoid build crashes, but the app won't function without real values.

## Known Gotchas

- **PDF polyfills:** `src/lib/pdf/polyfills.ts` defines DOMMatrix/DOMPoint/DOMRect stubs for `pdfjs-dist` in Node.js. Called via `applyPdfPolyfills()` in the cv/parse route. Brittle across `pdfjs-dist` upgrades.
- **Unused middleware helper:** `src/lib/supabase/middleware.ts` exports `updateSession()` but `src/middleware.ts` duplicates the logic inline instead of importing it.
- **Server external packages:** `next.config.ts` lists `pdf-parse` and `pdfjs-dist` as `serverExternalPackages`.
- **Schema is idempotent:** `schema.sql` uses `DROP POLICY IF EXISTS` before every `CREATE POLICY`, so it is safe to re-run on an existing database without errors.
- **OAuth setup required:** Google and GitHub OAuth buttons are wired on the client side but require providers to be configured in the Supabase dashboard (Authentication → Providers) before they work.
- **Cohort benchmarks need data:** The `cohort_stats` table is populated by a manual or scheduled aggregate job — it is not auto-populated by the app. Benchmarks only display when a cohort has ≥20 members.
- **`demo_rate_limits` has no RLS:** This table is accessed exclusively via the admin client (service role). Do not add RLS — it is intentionally bypassed for the unauthenticated demo route.
