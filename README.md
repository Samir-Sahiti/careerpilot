# CareerPilot

An AI-powered career management platform that closes the full job-search loop — from CV to offer — and learns from your outcomes over time.

## Features

### Core
- **CV Hub** — Upload your CV once. AI parses it into a structured profile that powers every other feature.
- **Job Analyzer** — Paste any listing and get a fit score (with confidence basis), matched/missing skills, salary context, and an honest apply/skip recommendation. Scores are calibrated against your own application history.
- **Interview Coach** — Adaptive AI mock interviews that follow up on vague answers, just like a real interviewer. Score trends tracked by question type (behavioral, technical, role-specific) across all sessions.
- **Career Ladder** — A living roadmap: pick a path, track skills and projects individually, mark them done, and watch your progress bar move. Next step always surfaced on the dashboard.
- **Cover Letter Generator** — Tailored cover letters from your CV and the job listing. Accessible inline from the job detail page.
- **Application Tracker** — Track every application with status, notes, and outcome capture. Rejection post-mortems generated automatically when you mark an app rejected.
- **Analytics** — Prescriptive insights: AI calibration drift, top rejection patterns, interview score trends, and cohort benchmarks against anonymised peers.

### Landing demo
- Paste any job listing on the homepage — no login required — to get an instant role breakdown (required skills, seniority, red flags). Rate-limited to 1 per IP per day.

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript 5 strict
- **AI** — [Vercel AI SDK](https://sdk.vercel.ai/) + Anthropic `claude-haiku-4-5`
- **Database & Auth** — [Supabase](https://supabase.com/) (PostgreSQL + Storage + Auth)
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com/)
- **Deployment** — [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- An [Anthropic](https://console.anthropic.com/) API key

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/careerpilot.git
cd careerpilot
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

1. Open your Supabase project → **SQL Editor** → **New query**
2. Paste the contents of `schema.sql` and click **Run**

The schema is idempotent — safe to run on a fresh database or re-run on an existing one.

### OAuth Setup (optional)

To enable Google and GitHub sign-in:

**GitHub:** Settings → Developer settings → OAuth Apps → New OAuth App. Set the callback URL to `https://<your-project-ref>.supabase.co/auth/v1/callback`. Copy the Client ID and Secret into Supabase → Authentication → Providers → GitHub.

**Google:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web). Add the same callback URL. Copy credentials into Supabase → Authentication → Providers → Google.

## Project Structure

```
careerpilot/
├── schema.sql                    # Full DB schema — run once in Supabase
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/            # OAuth + magic link + password fallback
│   │   │   ├── signup/           # OAuth + progressive email flow
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/        # Unified overview + NextStepWidget
│   │   │   ├── cv/
│   │   │   ├── jobs/[id]/        # Job analysis detail + Cover Letter CTA
│   │   │   ├── interview/
│   │   │   │   ├── new/
│   │   │   │   ├── [id]/
│   │   │   │   └── progress/     # Score trends by question type
│   │   │   ├── career/           # Living roadmap with item tracking
│   │   │   ├── cover-letter/
│   │   │   ├── applications/
│   │   │   ├── analytics/        # Prescriptive insights + cohort benchmarks
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── analytics/cohort/       # Cohort benchmarking
│   │   │   ├── applications/
│   │   │   │   ├── [id]/
│   │   │   │   ├── follow-up/
│   │   │   │   └── post-mortem/        # Rejection post-mortem
│   │   │   ├── career/
│   │   │   │   ├── roadmap/
│   │   │   │   └── roadmap-items/      # Item status toggle
│   │   │   ├── cv/
│   │   │   ├── interview/
│   │   │   └── jobs/
│   │   │       ├── analyze/
│   │   │       ├── company-context/
│   │   │       └── demo-analyze/       # Unauthenticated landing demo
│   │   └── page.tsx                    # Landing page with inline demo
│   ├── components/
│   │   ├── analytics/
│   │   ├── applications/               # Tracker + RejectionPostMortem
│   │   ├── career/                     # RoadmapDisplay (living plan)
│   │   ├── dashboard/                  # Widgets incl. NextStepWidget
│   │   ├── interview/                  # Sessions + ProgressView
│   │   ├── landing/                    # LandingDemo component
│   │   ├── layout/                     # Sidebar (primary/tools groups)
│   │   └── ui/                         # Shared components
│   ├── lib/
│   │   ├── supabase/
│   │   ├── ai/prompts.ts               # All AI prompt builders
│   │   ├── validation/schemas.ts       # All Zod schemas
│   │   ├── rateLimit.ts
│   │   └── logger.ts
│   └── types/index.ts                  # All shared TypeScript types
└── ...config files
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, bypasses RLS) |
| `ANTHROPIC_API_KEY` | Anthropic API key (server-side only) |

## Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User metadata |
| `cvs` | CV files and parsed structured data |
| `job_analyses` | Fit scores, skill gaps, salary context |
| `interview_sessions` | Questions, answers, scores |
| `career_roadmaps` | AI-generated career paths |
| `roadmap_items` | Individual tracked skills/projects within a roadmap |
| `cover_letters` | Generated cover letters |
| `tailored_cvs` | Per-job tailored CV versions |
| `applications` | Application tracking with outcome capture |
| `rate_limit_events` | Per-user AI request throttling |
| `demo_rate_limits` | IP-based throttle for the unauthenticated demo |
| `cohort_stats` | Aggregate peer benchmarks (populated by background job) |

## License

MIT
