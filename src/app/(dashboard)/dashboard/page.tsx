import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cv, JobAnalysis, InterviewSession, CareerRoadmap } from "@/types";
import { CVStatusWidget } from "@/components/dashboard/CVStatusWidget";
import { RecentJobsWidget } from "@/components/dashboard/RecentJobsWidget";
import { RecentInterviewsWidget } from "@/components/dashboard/RecentInterviewsWidget";
import { CareerRoadmapWidget } from "@/components/dashboard/CareerRoadmapWidget";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Parallel fetch — all four queries fire simultaneously ──────────────────
  const [cvResult, jobsResult, interviewsResult, roadmapResult, profileResult] =
    await Promise.all([
      // Active CV (single row or null)
      supabase
        .from("cvs")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),

      // Last 3 job analyses
      supabase
        .from("job_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),

      // Last 3 interview sessions
      supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),

      // Most recent career roadmap
      supabase
        .from("career_roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Profile details
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
    ]);

  const cv = (cvResult.data as Cv | null) ?? null;
  const jobs = (jobsResult.data as JobAnalysis[]) ?? [];
  const interviews = (interviewsResult.data as InterviewSession[]) ?? [];
  const roadmap = (roadmapResult.data as CareerRoadmap | null) ?? null;
  const profile = profileResult?.data as { full_name: string } | null;

  // Greeting: use name from profile or fallback to email prefix
  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div>
        <h1
          className="text-3xl font-extrabold text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Here&apos;s an overview of your CareerPilot activity.
        </p>
      </div>

      {/* ── Widget grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CVStatusWidget cv={cv} />
        <CareerRoadmapWidget roadmap={roadmap} />
        <RecentJobsWidget jobs={jobs} />
        <RecentInterviewsWidget sessions={interviews} />
      </div>
    </div>
  );
}

