"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Briefcase, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingFirstAnalysisPage() {
  const router = useRouter();
  const supabase = createClient();
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCv, setHasCv] = useState(false);
  const [cvId, setCvId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("cvs").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle().then(({ data }) => {
        if (data) { setHasCv(true); setCvId(data.id); }
      });
    });
  }, [supabase, router]);

  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvId) { toast.error("No CV found. Please upload your CV first."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId, jobTitle: jobTitle.trim(), company: company.trim() || undefined, jobRawText: jobText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      // Mark onboarding complete
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", user.id);
      }

      toast.success("Analysis complete! Welcome to CareerOS.");
      router.push(`/jobs/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed_at: new Date().toISOString() }).eq("id", user.id);
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}>
            Career<span style={{ color: "#f59e0b" }}>OS</span>
          </span>
        </div>

        {hasCv && (
          <div className="flex items-center gap-2 text-sm text-green-400 mb-4 justify-center">
            <CheckCircle2 className="w-4 h-4" />
            CV uploaded and ready
          </div>
        )}

        <div className="bg-[#1a1916] border border-[#2d2a26] rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-full mx-auto mb-4">
              <Briefcase className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Try your first job analysis
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Paste a job listing you&apos;re interested in. We&apos;ll tell you in 30 seconds if it&apos;s worth your time.
            </p>
          </div>

          <form onSubmit={handleAnalyse} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Job Title *</label>
                <input
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Company (optional)</label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe"
                  className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Job Description *</label>
              <textarea
                required
                rows={7}
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the full job description here…"
                className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !jobTitle.trim() || !jobText.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-semibold rounded-lg transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
              ) : (
                <>Analyse This Job</>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1"
          >
            Skip — go to dashboard
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
