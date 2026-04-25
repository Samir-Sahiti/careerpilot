import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobAnalyzerForm } from "@/components/jobs/JobAnalyzerForm";
import { JobAnalysisList } from "@/components/jobs/JobAnalysisList";
import Link from "next/link";
import { CopyX, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { Cv } from "@/types";

export default async function JobsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if they have an active CV
  const { data: cvData, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  // Condition 1: No active CV
  if (!cvData || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in-up max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2d2a26]/30 border border-[#2d2a26]">
          <CopyX className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h2
            className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            No CV uploaded
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            We need your CV to compare against job descriptions. Upload one first
            to unlock the Job Analyser.
          </p>
        </div>
        <Link
          href="/cv"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold rounded-lg transition-colors text-sm"
        >
          Upload your CV
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const cv = cvData as Cv;

  // Condition 2: CV parse failed — show a clear error, not an endless spinner
  if (cv.parse_status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in-up max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2
            className="text-2xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            CV parsing failed
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {cv.parse_error || "There was an error processing your CV."}
          </p>
        </div>
        <Link
          href="/cv"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-semibold rounded-lg transition-colors text-sm"
        >
          Fix CV
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Condition 3: CV still being parsed (pending)
  if (!cv.parsed_data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in-up">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <h2
          className="text-xl font-semibold text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          AI is still processing your CV...
        </h2>
        <p className="text-gray-400 text-sm">
          Check back in a minute to start analysing jobs.
        </p>
        <Link
          href="/cv"
          className="text-amber-400 hover:text-amber-300 text-sm font-medium mt-4"
        >
          ← View CV status
        </Link>
      </div>
    );
  }

  // Condition 4: Ready to analyse
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-fade-in-up pb-12">
      <JobAnalyzerForm cvId={cv.id} />
      <JobAnalysisList />
    </div>
  );
}
