"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Building2, FileText, Sparkles, Loader2 } from "lucide-react";
import { useStepCycle } from "@/hooks/useStepCycle";

interface JobAnalyzerFormProps {
  cvId: string;
}

const ANALYSIS_STEPS = [
  "Reading job description…",
  "Comparing against your CV…",
  "Scoring your skill match…",
  "Generating tailored suggestions…",
  "Finalising results…",
];

export function JobAnalyzerForm({ cvId }: JobAnalyzerFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobTitle, setJobTitle] = useState(searchParams.get("target_role") || "");
  const [company, setCompany] = useState("");
  const [jobRawText, setJobRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const { stepIndex, start: startStepCycle, stop: stopStepCycle } = useStepCycle(ANALYSIS_STEPS.length, 3500);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobRawText.trim() || !jobTitle.trim()) return;

    setLoading(true);
    startStepCycle();

    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvId,
          jobTitle: jobTitle.trim(),
          company: company.trim() || undefined,
          jobRawText: jobRawText.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      stopStepCycle();
      router.push(`/jobs/${data.id}`);
    } catch (err: unknown) {
      stopStepCycle();
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ── Loading overlay ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in-up">
        {/* Animated glow orb */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-amber-500/30 animate-ping [animation-delay:0.3s]" />
          <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40">
            <Sparkles className="w-7 h-7 text-amber-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Analysing your fit…
          </h2>
          <p className="text-gray-400 text-sm min-h-[1.5rem] transition-all duration-500">
            {ANALYSIS_STEPS[stepIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-[#2d2a26]/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-[3500ms] ease-in-out"
            style={{
              width: `${((stepIndex + 1) / ANALYSIS_STEPS.length) * 100}%`,
            }}
          />
        </div>

        <p className="text-gray-600 text-xs flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          This usually takes 10–20 seconds
        </p>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      {/* Page header */}
      <div>
        <h1
          className="text-3xl font-extrabold text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Job Analyser
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Paste a job description and we&apos;ll score how well your CV matches — instantly.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1916] border border-[#2d2a26] rounded-xl p-6 sm:p-8 space-y-6"
      >
        {/* Job title */}
        <div className="space-y-2">
          <label
            htmlFor="jobTitle"
            className="flex items-center gap-2 text-sm font-medium text-gray-300"
          >
            <Briefcase className="w-4 h-4 text-amber-400" />
            Job Title
            <span className="text-red-400">*</span>
          </label>
          <input
            id="jobTitle"
            type="text"
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
          />
        </div>

        {/* Company */}
        <div className="space-y-2">
          <label
            htmlFor="company"
            className="flex items-center gap-2 text-sm font-medium text-gray-300"
          >
            <Building2 className="w-4 h-4 text-purple-400" />
            Company
            <span className="text-gray-600 text-xs font-normal">(optional)</span>
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Stripe"
            className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
          />
        </div>

        {/* Job description */}
        <div className="space-y-2">
          <label
            htmlFor="jobRawText"
            className="flex items-center gap-2 text-sm font-medium text-gray-300"
          >
            <FileText className="w-4 h-4 text-green-400" />
            Job Description
            <span className="text-red-400">*</span>
          </label>
          <textarea
            id="jobRawText"
            required
            rows={14}
            value={jobRawText}
            onChange={(e) => setJobRawText(e.target.value)}
            placeholder="Paste the full job listing here — the more detail the better…"
            className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors resize-none leading-relaxed"
          />
          <p className="text-xs text-gray-600">
            {jobRawText.trim().length > 0
              ? `${jobRawText.trim().length} characters`
              : "Include responsibilities, requirements, and any other details for the best analysis."}
          </p>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !jobTitle.trim() || !jobRawText.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-900 font-semibold rounded-lg transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Analyse my fit
          </button>
        </div>
      </form>
    </div>
  );
}
