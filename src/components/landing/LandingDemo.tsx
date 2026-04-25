"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, AlertCircle, ChevronRight } from "lucide-react";

interface DemoResult {
  role_title: string;
  seniority_level: string;
  role_family: string;
  top_required_skills: string[];
  nice_to_have_skills: string[];
  key_responsibilities: string[];
  what_makes_a_strong_candidate: string;
  red_flags_to_watch: string[];
}

export function LandingDemo() {
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobText.trim() || jobText.length < 50) {
      setError("Paste at least 50 characters of the listing.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/jobs/demo-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobRawText: jobText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult(data.analysis);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="w-full rounded-2xl border border-amber-500/30 bg-[#0f0e0c] p-5 text-left space-y-5">
        {/* Role header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{result.role_family}</p>
            <h3 className="text-lg font-bold text-white mt-0.5">{result.role_title}</h3>
            <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {result.seniority_level}
            </span>
          </div>
          <button
            onClick={() => { setResult(null); setJobText(""); }}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors shrink-0 mt-1"
          >
            Try another
          </button>
        </div>

        {/* Required skills */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Must-have skills</p>
          <div className="flex flex-wrap gap-2">
            {result.top_required_skills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20">{s}</span>
            ))}
          </div>
        </div>

        {result.nice_to_have_skills.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nice to have</p>
            <div className="flex flex-wrap gap-2">
              {result.nice_to_have_skills.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Strong candidate */}
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
          <p className="text-xs font-bold text-green-400 mb-1">What makes a strong candidate</p>
          <p className="text-sm text-gray-300 leading-relaxed">{result.what_makes_a_strong_candidate}</p>
        </div>

        {/* Red flags */}
        {result.red_flags_to_watch.length > 0 && (
          <div className="rounded-lg bg-orange-500/5 border border-orange-500/20 p-3 space-y-1">
            <p className="text-xs font-bold text-orange-400 mb-1.5">Watch out for</p>
            {result.red_flags_to_watch.map((f) => (
              <p key={f} className="text-xs text-gray-400 flex gap-2 leading-relaxed"><span className="text-orange-400 shrink-0">⚠</span>{f}</p>
            ))}
          </div>
        )}

        {/* CTA to sign up */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <p className="text-xs text-gray-500 text-left">
            Sign up to see how <em>your</em> CV scores against this role — plus interview prep and cover letter.
          </p>
          <Link
            href="/signup"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-900 text-sm font-semibold rounded-lg transition-colors"
          >
            Try with my CV <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="relative">
        <textarea
          rows={4}
          value={jobText}
          onChange={(e) => { setJobText(e.target.value); setError(null); }}
          placeholder="Paste a job listing here — title, description, requirements…"
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[#1a1916]/80 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/60 transition-colors resize-none leading-relaxed"
        />
        {jobText.length > 0 && (
          <span className="absolute bottom-3 right-3 text-[10px] text-gray-600">{jobText.length} chars</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || jobText.length < 50}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-900 font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-amber-900/30"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analysing listing…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Analyse this listing</>
        )}
      </button>
    </form>
  );
}
