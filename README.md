# CareerPilot 🚀

An AI-powered career management platform that helps you land your next job and plan your long-term career growth.

## Features

- **CV Hub** — Upload your CV once, AI parses it into a structured profile that powers everything else
- **Job Analyzer** — Paste any job listing and get an instant fit score, skill gap analysis, and tailored CV improvement suggestions
- **Interview Coach** — AI-generated mock interviews tailored to the specific role and your background, with scored feedback on every answer
- **Career Ladder** — See what roles you can progress to next, with exactly what skills, projects, and experience you need to get there
- **Cover Letter Generator** — AI-crafted cover letters tailored to each job listing and your CV profile
- **Application Tracker** — Track every application from saved through offered/rejected with notes and links
- **Analytics** — Application funnel, job fit trends, skills gap, and interview score history

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org/) (App Router)
- **AI** — [Vercel AI SDK](https://sdk.vercel.ai/) + [Anthropic Claude](https://www.anthropic.com/)
- **Database & Auth** — [Supabase](https://supabase.com/) (PostgreSQL + Storage)
- **Styling** — [Tailwind CSS](https://tailwindcss.com/)
- **Deployment** — [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- An [Anthropic](https://console.anthropic.com/) API key

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/careerpilot.git
   cd careerpilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables — create a `.env.local` file in the root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
careerpilot/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── cv/
│   │   │   ├── jobs/
│   │   │   ├── interview/
│   │   │   └── career/
│   │   ├── api/
│   │   │   ├── cv/
│   │   │   ├── jobs/
│   │   │   ├── interview/
│   │   │   └── career/
│   │   └── page.tsx        # Landing page
│   ├── components/
│   ├── lib/
│   │   ├── supabase/
│   │   └── ai/
│   └── types/
├── public/
└── ...config files
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (server-side only) |

## Roadmap

- [x] Project setup
- [x] CV Hub — upload and AI parsing
- [x] Job Analyzer — fit score and gap analysis
- [x] Interview Coach — question generation and feedback
- [x] Career Ladder — progression mapping
- [x] Cover Letter Generator — AI-crafted tailored cover letters
- [x] Application Tracker — status tracking with notes
- [x] Dashboard — unified history and insights
- [x] Analytics — application funnel, skills gap, interview score trends

## License

MIT
