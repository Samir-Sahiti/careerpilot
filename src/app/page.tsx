import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LandingDemo } from "@/components/landing/LandingDemo";

// ── Scenario cards ─────────────────────────────────────────────────────────────
const scenarios = [
  {
    trigger: "I saw a listing at 10pm",
    question: "Should I even apply?",
    answer: "Paste the listing. Get a fit score, missing skills, and an honest recommendation in 30 seconds.",
    href: "/signup",
    cta: "Try it free",
    color: "border-blue-500/30 hover:border-blue-500/60",
    badge: "Job Analyzer",
    badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  },
  {
    trigger: "I got rejected yesterday",
    question: "What went wrong?",
    answer: "CareerPilot captures your outcomes and runs a post-mortem: likely gap, what similar candidates did next, what to add to your roadmap.",
    href: "/signup",
    cta: "Start tracking",
    color: "border-orange-500/30 hover:border-orange-500/60",
    badge: "Rejection Post-Mortem",
    badgeColor: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  },
  {
    trigger: "I have an interview Tuesday",
    question: "Am I actually ready?",
    answer: "Practice with an AI interviewer that knows your CV and the exact role. Follow-up questions included — just like a real interview.",
    href: "/signup",
    cta: "Start practising",
    color: "border-green-500/30 hover:border-green-500/60",
    badge: "Interview Coach",
    badgeColor: "bg-green-500/10 text-green-300 border-green-500/20",
  },
];

// ── Feature grid (secondary — demoted below scenarios) ────────────────────────
const features = [
  { emoji: "📄", title: "Smart CV Parsing", description: "Upload once. Your profile powers every tool — fit scores, interview questions, cover letters, career paths." },
  { emoji: "🎯", title: "Job Analyser", description: "Fit score with a rubric, matched and missing skills, salary context, and a tailored CV — all from one paste." },
  { emoji: "📋", title: "Application Tracker", description: "Track status, capture outcomes, and get rejection post-mortems. Your history teaches the AI to predict better." },
  { emoji: "🎤", title: "Interview Coach", description: "Adaptive mock interviews that follow up on vague answers. Score trends by question type across all sessions." },
  { emoji: "📈", title: "Career Ladder", description: "A living roadmap — track skills, mark them done, and watch your CV auto-complete items on the next upload." },
  { emoji: "📊", title: "Analytics", description: "Prescriptive, not descriptive. Calibration drift, rejection patterns, and cohort benchmarks against peers." },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] min-h-screen font-[var(--font-body)]">

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm border-b border-[var(--border-subtle)] bg-[var(--background)]/85">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Career<span className="text-blue-500">Pilot</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="nav-link text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 pt-20 pb-16 text-center">
        {/* Background glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-full max-w-2xl rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        {/* Dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%231E3A5F'/%3E%3C/svg%3E\")" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl mx-auto">
          <div className="animate-fade-in-up inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-[var(--border-subtle)] text-blue-400 bg-blue-600/8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            AI-Powered · Built for Ambitious Professionals
          </div>

          <h1 className="animate-fade-in-up delay-100 text-5xl md:text-6xl font-extrabold leading-tight tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Paste a job listing.{" "}
            <span className="bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
              Know in 30 seconds
            </span>{" "}
            if it&apos;s worth your time.
          </h1>

          <p className="animate-fade-in-up delay-200 text-lg text-gray-400 max-w-xl leading-relaxed">
            CareerPilot scores your fit, identifies gaps, preps your interview, and learns from every outcome — all from your CV.
          </p>

          {/* Inline demo */}
          <div className="animate-fade-in-up delay-300 w-full max-w-2xl">
            <LandingDemo />
          </div>

          <p className="animate-fade-in-up delay-300 text-xs text-gray-600">
            No account needed for the demo. &nbsp;
            <Link href="/signup" className="text-blue-400 hover:underline">Sign up free</Link>
            {" "}to analyse against your CV.
          </p>
        </div>
      </section>

      {/* ── Scenario cards ────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-gray-500 mb-10">
          Common triggers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {scenarios.map((s) => (
            <div
              key={s.trigger}
              className={`flex flex-col gap-4 rounded-2xl border bg-[var(--card-bg)] p-6 transition-colors ${s.color}`}
            >
              <div>
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-3 ${s.badgeColor}`}>
                  {s.badge}
                </span>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.trigger}</p>
                <h3 className="text-lg font-bold text-white mt-1" style={{ fontFamily: "var(--font-heading)" }}>
                  {s.question}
                </h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">{s.answer}</p>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {s.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-[var(--border-subtle)]">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: "var(--font-heading)" }}>
            Everything in one place
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Seven tools. One CV. One workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`animate-fade-in-up delay-${(i + 1) * 100} flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-6`}
            >
              <span className="text-3xl" role="img" aria-label={f.title}>{f.emoji}</span>
              <h3 className="text-base font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--border-subtle)] py-16 text-center px-6">
        <h2 className="text-2xl font-extrabold text-white mb-4" style={{ fontFamily: "var(--font-heading)" }}>
          Ready to stop guessing?
        </h2>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-lg shadow-blue-900/30 text-sm"
        >
          Get started — it&apos;s free
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="text-center py-8 text-sm text-gray-700 border-t border-[var(--border-subtle)]">
        CareerPilot &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
