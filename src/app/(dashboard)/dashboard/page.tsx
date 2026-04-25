import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cv, JobAnalysis, InterviewSession, CareerRoadmap, Application, RoadmapItem } from "@/types";
import { CVStatusWidget } from "@/components/dashboard/CVStatusWidget";
import { RecentJobsWidget } from "@/components/dashboard/RecentJobsWidget";
import { RecentInterviewsWidget } from "@/components/dashboard/RecentInterviewsWidget";
import { CareerRoadmapWidget } from "@/components/dashboard/CareerRoadmapWidget";
import { ApplicationsWidget } from "@/components/dashboard/ApplicationsWidget";
import { SkillsGapWidget } from "@/components/dashboard/SkillsGapWidget";
import { FollowUpWidget } from "@/components/dashboard/FollowUpWidget";
import { NoCvBanner } from "@/components/dashboard/NoCvBanner";
import { NextStepWidget } from "@/components/dashboard/NextStepWidget";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // All data fetched in parallel
  // eslint-disable-next-line react-hooks/purity
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  const [cvResult, jobsResult, interviewsResult, roadmapResult, profileResult, appsResult, followUpResult, roadmapItemsResult] =
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

      // Applications needing follow-up: 'applied' status, applied_at >= 10 days ago, no follow_up_sent_at
      supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "applied")
        .not("applied_at", "is", null)
        .lte("applied_at", tenDaysAgo)
        .is("follow_up_sent_at", null),

      // Roadmap items for NextStepWidget — fetched lazily after roadmap is known
      // We fetch without roadmap_id filter here; will filter below
      supabase
        .from("roadmap_items")
        .select("*")
        .eq("user_id", user.id)
        .order("status", { ascending: true }) // not_started first
        .order("created_at", { ascending: true }),
    ]);

  const cv             = (cvResult.data as Cv | null) ?? null;
  const jobs           = (jobsResult.data as JobAnalysis[]) ?? [];
  const interviews     = (interviewsResult.data as InterviewSession[]) ?? [];
  const roadmap        = (roadmapResult.data as CareerRoadmap | null) ?? null;
  const profile        = profileResult?.data as { full_name: string } | null;
  const applications   = (appsResult.data as Application[]) ?? [];
  const followUpApps   = (followUpResult.data as Application[]) ?? [];
  const allRoadmapItems = (roadmapItemsResult.data as RoadmapItem[]) ?? [];

  // Filter to current roadmap's items only
  const roadmapItems = roadmap
    ? allRoadmapItems.filter((i) => i.roadmap_id === roadmap.id)
    : [];
  const nextItem = roadmapItems.find((i) => i.status !== "done") ?? null;
  const inProgressCount = roadmapItems.filter((i) => i.status === "in_progress").length;
  const doneCount = roadmapItems.filter((i) => i.status === "done").length;

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Here&apos;s an overview of your CareerOS activity.
        </p>
      </div>

      {/* No-CV banner — shown until CV is uploaded */}
      {!cv && <NoCvBanner />}

      {/* Follow-up reminders widget */}
      {followUpApps.length > 0 && <FollowUpWidget applications={followUpApps} />}

      {/* Next career step widget */}
      {roadmapItems.length > 0 && (
        <NextStepWidget
          nextItem={nextItem}
          inProgressCount={inProgressCount}
          doneCount={doneCount}
          totalCount={roadmapItems.length}
        />
      )}

      {/* 2×2 grid for core widgets */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CVStatusWidget cv={cv} />
        <CareerRoadmapWidget roadmap={roadmap} />
        <RecentJobsWidget jobs={jobs} />
        <RecentInterviewsWidget sessions={interviews} />
      </div>

      {/* Skills Gap widget — full width below the 2×2 grid */}
      <SkillsGapWidget jobs={jobs} roadmap={roadmap} />

      {/* Applications widget — full width below the 2×2 grid */}
      <ApplicationsWidget applications={applications} />
    </div>
  );
}
