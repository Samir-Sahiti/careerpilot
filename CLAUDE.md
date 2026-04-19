# CareerPilot

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
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup pages
│   ├── (dashboard)/         # Protected pages: dashboard, cv, jobs, interview,
│   │                        #   career, cover-letter, applications, settings, analytics
│   ├── api/                 # API routes: account, applications, career,
│   │                        #   cover-letter, cv, interview, jobs
│   ├── auth/callback/       # Supabase OAuth callback
│   ├── layout.tsx           # Root layout (fonts, ThemeProvider, Toaster)
│   ├── page.tsx             # Landing page
│   └── not-found.tsx
├── components/
│   ├── analytics/           # Analytics dashboard client component
│   ├── applications/        # Application tracker components
│   ├── career/              # Career ladder components
│   ├── cover-letter/        # Cover letter generator + ExportCoverLetterButton
│   ├── cv/                  # CV upload, parsing, profile display
│   ├── dashboard/           # Dashboard widgets (incl. SkillsGapWidget)
│   ├── interview/           # Mock interview components + ExportInterviewButton
│   ├── jobs/                # Job analyzer components
│   ├── layout/              # Sidebar, SignOutButton, ThemeProvider, ThemeToggle
│   ├── settings/            # Settings form
│   └── ui/                  # Shared UI library: Button, Card, Badge, Input,
│                            #   LoadingSpinner, EmptyState
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client (createBrowserClient)
│   │   ├── server.ts        # Server client + admin client (service role)
│   │   └── middleware.ts    # Session refresh helper (currently unused by middleware)
│   ├── ai/
│   │   └── prompts.ts       # All AI prompt builder functions (centralised)
│   ├── pdf/
│   │   └── polyfills.ts     # DOMMatrix/DOMPoint/DOMRect stubs for pdfjs-dist in Node.js
│   ├── validation/
│   │   └── schemas.ts       # Zod schemas for all API request bodies
│   ├── __tests__/
│   │   └── rateLimit.test.ts # Vitest unit tests for rate limiting
│   ├── apiResponse.ts       # errorResponse / successResponse / rateLimitResponse helpers
│   ├── exportToPdf.ts       # Client-side print-to-PDF utility (window.print)
│   ├── logger.ts            # Structured JSON logger (info/warn/error)
│   └── rateLimit.ts         # Global + per-route AI rate limiting (fails CLOSED)
├── types/
│   └── index.ts             # All shared TypeScript interfaces
└── middleware.ts             # Auth middleware (session refresh + route protection)
```

Schema file at project root: `schema.sql` (consolidated — safe to run on fresh or existing databases).

## Key Patterns

### Supabase SSR — Three Client Types
1. **Browser client** (`lib/supabase/client.ts`): `createBrowserClient` — used in client components
2. **Server client** (`lib/supabase/server.ts`): `createServerClient` with cookie forwarding — used in server components and API routes
3. **Admin client** (`lib/supabase/server.ts`): uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS — used for storage ops and CV parsing

### Auth Middleware
`src/middleware.ts` refreshes sessions on every request via `getSession()`. Redirects unauthenticated users away from dashboard routes and authenticated users away from auth routes. Dashboard layout double-checks with `getUser()`.

### AI SDK Usage
- **Structured output:** `generateObject()` with Zod schemas — CV parsing, job analysis, interview questions, career roadmaps
- **Free-form:** `generateText()` — cover letters
- **Streaming:** `streamText()` — interview feedback
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

### Rate Limiting
Two-tier system tracked via `rate_limit_events` table:
- **Global:** 10 AI requests per hour per user
- **Per-route:** `/api/cv/parse` (3/hr), `/api/cover-letter/generate` (5/hr)
- Check runs before AI call; consumption recorded after success
- **Fails CLOSED** — denies on DB error (never allows on error)
- Returns HTTP 429 with `Retry-After: 3600` when exceeded

### API Route Pattern
Every route: validate body with Zod (`schema.safeParse`) → authenticate with `supabase.auth.getUser()` → check rate limit → AI call → persist to DB → consume rate limit. All set `export const maxDuration = 60`.

Use helpers from `src/lib/apiResponse.ts`:
- `errorResponse(message, status?, headers?)` — `{ error: message }`
- `successResponse(data, status?)` — data as JSON
- `rateLimitResponse(message)` — 429 with Retry-After

Log all errors with `logger.error(message, context, error)` from `src/lib/logger.ts`.

### Request Body Validation
All API routes use Zod schemas from `src/lib/validation/schemas.ts`. Use `schema.safeParse(body)` and return 400 with `errors[0].message` on failure.

### Theme
`next-themes` with `attribute="class"`. Dark/light CSS variables in `globals.css` under `:root` (dark default) and `.light`. Toggle is in the Sidebar via `ThemeToggle` component from `src/components/layout/ThemeToggle.tsx`.

### Shared UI Components
Import from `@/components/ui`: `Button`, `Card`, `Badge`, `Input`, `LoadingSpinner`, `EmptyState`.

### Path Alias
`@/*` maps to `./src/*` (tsconfig paths).

## Database

PostgreSQL via Supabase. Eight tables, all with Row-Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User metadata (auto-created via trigger on signup) |
| `cvs` | Uploaded CVs with parsed text and structured data (JSONB) |
| `job_analyses` | Job fit scores, skill matches, salary estimates |
| `interview_sessions` | Mock interview questions, answers, scores |
| `career_roadmaps` | AI-generated career progression paths |
| `cover_letters` | Generated cover letters |
| `applications` | Application tracking with status enum |
| `rate_limit_events` | Rate limit tracking (RLS added in schema-additions.sql) |

- **Storage bucket:** `cvs` (private, RLS scoped to `{user_id}/{filename}`)
- **Enum:** `application_status` — `saved`, `applied`, `interviewing`, `offered`, `rejected`

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
