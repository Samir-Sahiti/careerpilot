import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Application, JobAnalysis, InterviewSession } from "@/types";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export const metadata = { title: "Analytics — CareerOS" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [appsResult, jobsResult, interviewsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("job_analyses")
      .select("fit_score, recommendation, created_at, missing_skills")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("interview_sessions")
      .select("overall_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <AnalyticsClient
      applications={(appsResult.data as Application[]) ?? []}
      jobs={(jobsResult.data as JobAnalysis[]) ?? []}
      interviews={(interviewsResult.data as InterviewSession[]) ?? []}
    />
  );
}
