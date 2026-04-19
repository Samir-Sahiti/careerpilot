import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobAnalysis, SalaryEstimate } from "@/types";
import { FitScoreArc } from "@/components/jobs/FitScoreArc";
import { TrackApplicationButton } from "@/components/jobs/TrackApplicationButton";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MessageSquare,
  AlertTriangle,
  FileEdit,
  DollarSign,
  TrendingUp,
  Info,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Salary section helpers ────────────────────────────────────────────────────
function SalaryRangeBar({ salary }: { salary: Extract<SalaryEstimate, { shown_in_listing: true }> }) {
  const range = salary.high - salary.low;
  const midPct = range > 0 ? ((salary.mid - salary.low) / range) * 100 : 50;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-400 w-16 text-right shrink-0">
          {salary.currency} {fmt(salary.low)}
        </span>
        <div className="relative flex-1 h-3 bg-[#1E3A5F]/60 rounded-full">
          <div
            className="absolute left-0 top-0 h-full bg-blue-600/60 rounded-full"
            style={{ width: `${midPct}%` }}
          />
          <div
            className="absolute top-1/2 w-4 h-4 bg-blue-400 rounded-full border-2 border-[#0A0F1C] shadow"
            style={{ left: `${midPct}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-400 w-16 shrink-0">
          {salary.currency} {fmt(salary.high)}
        </span>
      </div>
      <p className="text-center text-xs text-gray-500">
        Mid-range (from listing):{" "}
        <span className="text-white font-semibold">
          {salary.currency} {fmt(salary.mid)}
        </span>
      </p>
    </div>
  );
}

function SalarySection({ salary }: { salary: SalaryEstimate }) {
  return (
    <div className="space-y-6">
      {salary.shown_in_listing ? (
        <SalaryRangeBar salary={salary} />
      ) : (
        <div className="flex items-start gap-3 bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg p-4">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300 leading-relaxed">{salary.guidance}</p>
        </div>
      )}

      <div className="flex items-start gap-3 bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg p-4">
        <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-emerald-400 font-semibold">Negotiation tip: </span>
          {salary.negotiation_tip}
        </p>
      </div>
    </div>
  );
}

export default async function JobAnalysisResultPage({ params }: PageProps) {
  const { id: analysisId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: analysisData, error } = await supabase
    .from("job_analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single();

  if (error || !analysisData) notFound();

  const analysis = analysisData as JobAnalysis;

  const rec = analysis.recommendation || "maybe";
  let recTheme = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  let RecIcon = AlertTriangle;
  if (rec === "apply") { recTheme = "bg-green-500/10 text-green-400 border-green-500/20"; RecIcon = CheckCircle2; }
  if (rec === "skip")  { recTheme = "bg-red-500/10 text-red-400 border-red-500/20";     RecIcon = XCircle; }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">

      {/* Back */}
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to all analyses
      </Link>

      {/* Header card */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-8 items-start sm:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
        <div className="flex flex-col items-center gap-2">
          <FitScoreArc score={analysis.fit_score ?? 0} />
          {analysis.fit_score_basis && (
            <ConfidenceBadge basis={analysis.fit_score_basis} rationale={analysis.fit_score_rationale} />
          )}
        </div>
        <div className="flex-1 space-y-4 relative z-10 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              {analysis.job_title}
            </h1>
            {analysis.company && (
              <span className="flex items-center gap-1.5 font-medium text-gray-300 text-sm mt-2">
                <Building2 className="w-4 h-4" />
                {analysis.company}
              </span>
            )}
          </div>
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

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>Matched Skills</h3>
          </div>
          {analysis.matched_skills?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.matched_skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-[#1E3A5F]/30 text-green-400 text-sm font-medium rounded-md border border-green-500/20">{skill}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No direct matches found.</p>
          )}
        </div>

        <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
            <XCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>Missing Skills</h3>
          </div>
          {analysis.missing_skills?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.missing_skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-[#1E3A5F]/30 text-red-400 text-sm font-medium rounded-md border border-red-500/20">{skill}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">You meet all listed requirements!</p>
          )}
        </div>
      </div>

      {/* CV Suggestions */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>Actionable CV Suggestions</h3>
        </div>
        {analysis.cv_suggestions?.length > 0 ? (
          <ul className="space-y-3">
            {analysis.cv_suggestions.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-300">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#1E3A5F]/50 flex items-center justify-center text-xs font-bold text-amber-500">{i + 1}</span>
                <span className="pt-0.5 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">Your CV looks perfectly tailored already.</p>
        )}
      </div>

      {/* Salary */}
      {analysis.salary_estimate && (
        <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-white pb-3 border-b border-[#1E3A5F]">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {analysis.salary_estimate.shown_in_listing ? "Salary (from listing)" : "Salary"}
            </h3>
          </div>
          <SalarySection salary={analysis.salary_estimate} />
        </div>
      )}

      {/* CTAs */}
      <div className="pt-6 border-t border-[#1E3A5F] flex flex-wrap items-center gap-3 sm:justify-end">
        <TrackApplicationButton
          jobAnalysisId={analysis.id}
          jobTitle={analysis.job_title}
          company={analysis.company}
        />
        <Link
          href={`/cover-letter?job_analysis_id=${analysis.id}`}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#111827] border border-[#1E3A5F] hover:border-blue-500/50 hover:bg-[#1E3A5F]/30 text-gray-300 hover:text-white font-medium rounded-lg transition-all text-sm"
        >
          <FileEdit className="w-4 h-4" />
          Generate Cover Letter
        </Link>
        <Link
          href={`/interview/new?job_id=${analysis.id}`}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-blue-900/20"
        >
          <MessageSquare className="w-4 h-4" />
          Start Interview Prep
        </Link>
      </div>
    </div>
  );
}
