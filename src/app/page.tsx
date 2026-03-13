import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ── Feature card data ─────────────────────────────────────────────────────────
const features = [
  {
    emoji: "🎯",
    title: "Job Analyser",
    description:
      "Paste any job listing and get an instant fit score, matched skills, and a personalised skill gap analysis.",
  },
  {
    emoji: "🎤",
    title: "Interview Coach",
    description:
      "Practice with AI-generated questions tailored to the exact role and your background. Get scored, actionable feedback.",
  },
  {
    emoji: "📈",
    title: "Career Ladder",
    description:
      "See exactly what skills to build, what projects to ship, and how long it realistically takes to reach the next level.",
  },
];

// ── SVG dot-grid background (20×20 tile) ──────────────────────────────────────
const DOT_GRID = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%231E3A5F'/%3E%3C/svg%3E")`;

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  // Server-side auth check — authenticated users go straight to dashboard
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div
      style={{
        backgroundColor: "#0A0F1C",
        color: "#F1F5F9",
        minHeight: "100vh",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <nav
        style={{ borderBottom: "1px solid #1E3A5F" }}
        className="sticky top-0 z-50 backdrop-blur-sm"
      >
        <div
          style={{ backgroundColor: "rgba(10,15,28,0.85)" }}
          className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
        >
          {/* Logo */}
          <span
            className="text-xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}
          >
            Career<span style={{ color: "#2563EB" }}>Pilot</span>
          </span>

          {/* Nav actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="nav-link text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          minHeight: "calc(100vh - 65px)",
          backgroundImage: DOT_GRID,
        }}
      >
        {/* Radial glow behind the headline */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100%",
            height: "600px",
            background:
              "radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto flex flex-col items-center gap-8">
          {/* Badge */}
          <div
            className="animate-fade-in-up inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full"
            style={{
              border: "1px solid #1E3A5F",
              color: "#60A5FA",
              backgroundColor: "rgba(37,99,235,0.08)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "#2563EB" }}
            />
            AI-Powered · Built for Ambitious Professionals
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up delay-100 text-5xl md:text-6xl font-extrabold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}
          >
            Your AI{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Career Co-Pilot
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="animate-fade-in-up delay-200 text-xl leading-relaxed max-w-xl"
            style={{ color: "#94A3B8" }}
          >
            Analyse job fits, practise interviews, and map your path to the next
            level — all in one place.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center gap-4">
            <Link
              id="cta-get-started"
              href="/signup"
              className="w-full sm:w-auto text-sm font-semibold px-8 py-3 rounded-xl transition-all"
              style={{
                backgroundColor: "#2563EB",
                color: "#FFFFFF",
                boxShadow: "0 0 20px rgba(37,99,235,0.35)",
              }}
            >
              Get Started — it&apos;s free
            </Link>
            <Link
              id="cta-log-in"
              href="/login"
              className="w-full sm:w-auto text-sm font-semibold px-8 py-3 rounded-xl transition-all"
              style={{
                border: "1px solid #2563EB",
                color: "#60A5FA",
              }}
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}
          >
            Everything your career needs
          </h2>
          <p style={{ color: "#64748B" }} className="text-lg max-w-xl mx-auto">
            Three powerful tools, one seamless workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`animate-fade-in-up delay-${(i + 2) * 100} flex flex-col gap-4`}
              style={{
                background: "#111827",
                border: "1px solid #1E3A5F",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <span className="text-4xl" role="img" aria-label={feature.title}>
                {feature.emoji}
              </span>
              <h3
                className="text-lg font-bold"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: "#F1F5F9",
                }}
              >
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        className="text-center py-8 text-sm"
        style={{
          borderTop: "1px solid #1E3A5F",
          color: "#334155",
        }}
      >
        CareerPilot &copy; 2025
      </footer>
    </div>
  );
}
