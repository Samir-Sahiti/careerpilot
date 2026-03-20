import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobAnalysis } from "@/types";
import { FitScoreArc } from "@/components/jobs/FitScoreArc";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  MessageSquare,
  AlertTriangle
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobAnalysisResultPage({ params }: PageProps) {
  const resolvedParams = await params;
  const analysisId = resolvedParams.id;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Fetch the analysis securely ──────────────────────────────────────────
  const { data: analysisData, error } = await supabase
    .from("job_analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single();

  if (error || !analysisData) {
    notFound();
  }

  const analysis = analysisData as JobAnalysis;

  // ── Recommendation formatting ────────────────────────────────────────────
  const rec = analysis.recommendation || "maybe";
  let recTheme = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  let RecIcon = AlertTriangle;

  if (rec === "apply") {
    recTheme = "bg-green-500/10 text-green-400 border-green-500/20";
    RecIcon = CheckCircle2;
  } else if (rec === "skip") {
    recTheme = "bg-red-500/10 text-red-400 border-red-500/20";
    RecIcon = XCircle;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
      {/* ── Top Navigation ────────────────────────────────────────────────── */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all analyses
      </Link>

      {/* ── Header Card ───────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-8 items-start sm:items-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
        
        {/* Score Ring */}
        <FitScoreArc score={analysis.fit_score ?? 0} />

        <div className="flex-1 space-y-4 relative z-10 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              {analysis.job_title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-400 text-sm">
              {analysis.company && (
                <span className="flex items-center gap-1.5 font-medium text-gray-300">
                  <Building2 className="w-4 h-4" />
                  {analysis.company}
                </span>
              )}
            </div>
          </div>

          {/* AI Recommendation Banner */}
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${recTheme}`}>
            <RecIcon className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-xs mb-1">
                AI Recommendation: {rec}
              </p>
              <p className="text-sm opacity-90 leading-relaxed">
                {analysis.recommendation_reason || "Based on your CV, this is a reasonable match."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Details Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Matched Skills */}
        <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>Matched Skills</h3>
          </div>
          {analysis.matched_skills && analysis.matched_skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.matched_skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-[#1E3A5F]/30 text-green-400 text-sm font-medium rounded-md border border-green-500/20">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No direct matches found.</p>
          )}
        </div>

        {/* Missing Skills */}
        <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>Missing Required Skills</h3>
          </div>
          {analysis.missing_skills && analysis.missing_skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.missing_skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-[#1E3A5F]/30 text-red-400 text-sm font-medium rounded-md border border-red-500/20">
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">You meet all listed requirements!</p>
          )}
        </div>

      </div>

      {/* ── CV Suggestions ────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>Actionable CV Suggestions</h3>
        </div>
        {analysis.cv_suggestions && analysis.cv_suggestions.length > 0 ? (
          <ul className="space-y-3">
            {analysis.cv_suggestions.map((suggestion, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#1E3A5F]/50 flex items-center justify-center text-xs font-bold text-amber-500">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-relaxed">{suggestion}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">Your CV looks perfectly tailored already.</p>
        )}
      </div>

      {/* ── Floating CTA Action ───────────────────────────────────────────── */}
      <div className="pt-6 border-t border-[#1E3A5F] flex sm:justify-end">
        <Link
          href={`/interview/new?job_id=${analysis.id}`}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-blue-900/20"
        >
          <MessageSquare className="w-4 h-4" />
          Start Interview Prep
        </Link>
      </div>

    </div>
  );
}
