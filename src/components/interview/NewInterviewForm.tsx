"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Building2, PlayCircle, Loader2, Zap } from "lucide-react";
import { useStepCycle } from "@/hooks/useStepCycle";

interface NewInterviewFormProps {
  initialJobTitle?: string;
  initialCompany?: string;
  jobAnalysisId?: string;
}

const GENERATION_STEPS = [
  "Analysing target role...",
  "Reviewing your CV...",
  "Drafting technical questions...",
  "Preparing behavioural scenarios...",
  "Finalising interview structure...",
];

export function NewInterviewForm({
  initialJobTitle = "",
  initialCompany = "",
  jobAnalysisId,
}: NewInterviewFormProps) {
  const router = useRouter();
  const [targetRole, setTargetRole] = useState(initialJobTitle);
  const [targetCompany, setTargetCompany] = useState(initialCompany);
  const [mode, setMode] = useState<"standard" | "adaptive">("standard");
  const [loading, setLoading] = useState(false);
  const { stepIndex, start: startStepCycle, stop: stopStepCycle } = useStepCycle(GENERATION_STEPS.length, 4000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetRole.trim()) return;

    setLoading(true);
    startStepCycle();

    try {
      const res = await fetch("/api/interview/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: targetRole.trim(),
          companyName: targetCompany.trim() || undefined,
          jobAnalysisId,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start interview");
      }

      stopStepCycle();
      router.push(`/interview/${data.id}`);
    } catch (err: unknown) {
      stopStepCycle();
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-8 animate-fade-in-up">
        {/* Abstract animated avatar/mic loader */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full border-b-2 border-blue-500 animate-spin" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 rounded-full border-t-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
          <div className="relative z-10 flex flex-col justify-end w-12 h-16 bg-[#2d2a26]/40 border border-[#2d2a26] rounded-full overflow-hidden pb-2">
            <div className="w-1.5 h-6 bg-blue-500 mx-auto rounded-full animate-pulse" />
            <div className="flex gap-1 justify-center mt-1">
              <div className="w-1 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Building your interview...
          </h2>
          <p className="text-gray-400 text-sm min-h-[1.5rem] transition-all duration-500">
            {GENERATION_STEPS[stepIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-[#2d2a26]/60 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-[4000ms] ease-in-out"
            style={{ width: `${((stepIndex + 1) / GENERATION_STEPS.length) * 100}%` }}
          />
        </div>

        <p className="text-gray-600 text-xs flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          This takes about 15–20 seconds
        </p>
      </div>
    );
  }

  // ── Form Entry state ───────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in-up">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1916] border border-[#2d2a26] rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
        
        {jobAnalysisId && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm px-4 py-3 rounded-lg flex items-start gap-3">
            <span className="shrink-0 pt-0.5">ℹ️</span>
            <span>
              We automatically loaded the role from your previous analysis. Adjust the fields below if needed, or proceed directly.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-2">
            <label htmlFor="targetRole" className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Briefcase className="w-4 h-4 text-amber-400" />
              Target Role <span className="text-red-400">*</span>
            </label>
            <input
              id="targetRole"
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Frontend Engineer"
              className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="targetCompany" className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Building2 className="w-4 h-4 text-purple-400" />
              Target Company <span className="text-gray-600 text-xs font-normal">(optional)</span>
            </label>
            <input
              id="targetCompany"
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="e.g. OpenAI"
              className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
          <button
            type="button"
            onClick={() => setMode("standard")}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === "standard" ? "border-blue-500 bg-amber-500/10" : "border-[#2d2a26] hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <PlayCircle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Standard</span>
            </div>
            <p className="text-xs text-gray-400">10 pre-generated questions, answer at your own pace.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("adaptive")}
            className={`p-4 rounded-xl border text-left transition-all ${
              mode === "adaptive" ? "border-purple-500 bg-purple-500/10" : "border-[#2d2a26] hover:border-purple-500/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Adaptive</span>
            </div>
            <p className="text-xs text-gray-400">AI probes your answers with follow-up questions, like a real interview.</p>
          </button>
        </div>

        <div className="pt-2 flex justify-end relative z-10">
          <button
            type="submit"
            disabled={loading || !targetRole.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-900 font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-amber-900/20"
          >
            <PlayCircle className="w-5 h-5" />
            Start Interview
          </button>
        </div>
      </form>
    </div>
  );
}
