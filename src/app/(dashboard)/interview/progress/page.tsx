import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { ProgressView } from "@/components/interview/ProgressView";

export default async function InterviewProgressPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("interview_sessions")
    .select("id, user_id, job_analysis_id, questions, overall_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const allSessions = sessions ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Link
          href="/interview"
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Interview Progress
            </h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Score trends by question type across all sessions.
          </p>
        </div>
      </div>

      <ProgressView sessions={allSessions} />
    </div>
  );
}
