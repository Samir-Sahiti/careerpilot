import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cv, JobAnalysis, InterviewSession, CareerRoadmap, Application } from "@/types";
import { CVStatusWidget } from "@/components/dashboard/CVStatusWidget";
import { RecentJobsWidget } from "@/components/dashboard/RecentJobsWidget";
import { RecentInterviewsWidget } from "@/components/dashboard/RecentInterviewsWidget";
import { CareerRoadmapWidget } from "@/components/dashboard/CareerRoadmapWidget";
import { ApplicationsWidget } from "@/components/dashboard/ApplicationsWidget";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // All data fetched in parallel
  const [cvResult, jobsResult, interviewsResult, roadmapResult, profileResult, appsResult] =
    await Promise.all([
      supabase
        .from("cvs")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),

      supabase
        .from("job_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),

      supabase
        .from("interview_sessions")
        .select("*, job_analyses(job_title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),

      supabase
        .from("career_roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),

      supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const cv           = (cvResult.data as Cv | null) ?? null;
  const jobs         = (jobsResult.data as JobAnalysis[]) ?? [];
  const interviews   = (interviewsResult.data as InterviewSession[]) ?? [];
  const roadmap      = (roadmapResult.data as CareerRoadmap | null) ?? null;
  const profile      = profileResult?.data as { full_name: string } | null;
  const applications = (appsResult.data as Application[]) ?? [];

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Here&apos;s an overview of your CareerPilot activity.
        </p>
      </div>

      {/* 2×2 grid for core widgets */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CVStatusWidget cv={cv} />
        <CareerRoadmapWidget roadmap={roadmap} />
        <RecentJobsWidget jobs={jobs} />
        <RecentInterviewsWidget sessions={interviews} />
      </div>

      {/* Applications widget — full width below the 2×2 grid */}
      <ApplicationsWidget applications={applications} />
    </div>
  );
}
