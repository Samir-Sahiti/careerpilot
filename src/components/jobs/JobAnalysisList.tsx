import { createClient } from "@/lib/supabase/server";
import { JobAnalysis } from "@/types";
import Link from "next/link";
import { format } from "date-fns";
import { Briefcase, ArrowRight, MousePointerClick } from "lucide-react";

export async function JobAnalysisList() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ── Fetch history ────────────────────────────────────────────────────────
  const { data: analyses, error } = await supabase
    .from("job_analyses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !analyses || analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-[#1E3A5F] rounded-xl bg-[#0A0F1C]/50 mt-12 animate-fade-in-up">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#1E3A5F]/30 mb-4">
          <MousePointerClick className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          No analyses yet
        </h3>
        <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
          Paste your first job description in the form above to see how well your profile matches.
        </p>
      </div>
    );
  }

  // ── Render list ──────────────────────────────────────────────────────────
  return (
    <div className="mt-16 space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <Briefcase className="w-5 h-5 text-blue-500" />
          Previous Analyses
        </h2>
        <p className="text-sm text-gray-400 mt-1">Review your past job matches and recommendations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(analyses as JobAnalysis[]).map((job) => {
          // Color-code the score
          const score = job.fit_score ?? 0;
          let colorClass = "text-green-400 bg-green-500/10 border-green-500/20";
          if (score < 41) {
            colorClass = "text-red-400 bg-red-500/10 border-red-500/20";
          } else if (score < 70) {
            colorClass = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
          }

          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="group block bg-[#111827] border border-[#1E3A5F] rounded-xl p-5 hover:bg-[#1E3A5F]/20 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors" title={job.job_title}>
                    {job.job_title}
                  </h3>
                  {job.company && (
                    <p className="text-sm text-gray-400 truncate mt-0.5" title={job.company}>
                      {job.company}
                    </p>
                  )}
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${colorClass}`}>
                  {score}%
                </div>
              </div>

              <div className="flex items-center justify-between text-xs border-t border-[#1E3A5F]/50 pt-4 mt-auto">
                <span className="text-gray-500">
                  {format(new Date(job.created_at), "MMM d, yyyy")}
                </span>
                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                  View <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
