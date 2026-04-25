"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  FileText, Plus, Sparkles, Loader2, Copy, Download,
  RefreshCw, ArrowLeft, Briefcase, Building2, CheckCircle2,
  Trash2, FileEdit
} from "lucide-react";
import { CoverLetter, JobAnalysis } from "@/types";
import { ExportCoverLetterButton } from "./ExportCoverLetterButton";

interface Props {
  initialLetters: CoverLetter[];
  prefillAnalysis: JobAnalysis | null;
}

type Mode = "list" | "form" | "generating" | "view";

export function CoverLetterClient({ initialLetters, prefillAnalysis }: Props) {
  const [letters, setLetters] = useState<CoverLetter[]>(initialLetters);
  const [mode, setMode] = useState<Mode>(
    prefillAnalysis ? "form" : initialLetters.length === 0 ? "form" : "list"
  );
  const [activeLetter, setActiveLetter] = useState<CoverLetter | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [jobTitle, setJobTitle] = useState(prefillAnalysis?.job_title ?? "");
  const [company, setCompany] = useState(prefillAnalysis?.company ?? "");
  const [jobRawText, setJobRawText] = useState(prefillAnalysis?.job_raw_text ?? "");

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;
    setMode("generating");

    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          company: company.trim() || undefined,
          jobRawText: jobRawText.trim() || undefined,
          jobAnalysisId: prefillAnalysis?.id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const newLetter: CoverLetter = {
        id: data.id,
        user_id: "",
        job_analysis_id: prefillAnalysis?.id ?? null,
        job_title: jobTitle.trim(),
        company: company.trim() || null,
        content: data.content,
        created_at: new Date().toISOString(),
      };

      setLetters((prev) => [newLetter, ...prev]);
      setActiveLetter(newLetter);
      setMode("view");
      toast.success("Cover letter generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setMode("form");
    }
  };

  const handleRegenerate = async () => {
    if (!activeLetter) return;
    setMode("generating");

    try {
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: activeLetter.job_title,
          company: activeLetter.company || undefined,
          jobAnalysisId: activeLetter.job_analysis_id || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Regeneration failed");

      const newLetter: CoverLetter = {
        ...activeLetter,
        id: data.id,
        content: data.content,
        created_at: new Date().toISOString(),
      };

      setLetters((prev) => [newLetter, ...prev]);
      setActiveLetter(newLetter);
      setMode("view");
      toast.success("New version generated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setMode("view");
    }
  };

  const handleDelete = async (letterId: string) => {
    if (!confirm("Delete this cover letter? This cannot be undone.")) return;

    const res = await fetch(`/api/cover-letter/${letterId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }

    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (activeLetter?.id === letterId) {
      setActiveLetter(null);
      setMode("list");
    }
    toast.success("Deleted");
  };

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — please select and copy manually");
    }
  }, []);

  const handleDownload = (letter: CoverLetter) => {
    const blob = new Blob([letter.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${letter.job_title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Cover Letters
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            AI-generated, tailored cover letters for every application.
          </p>
        </div>
        {mode !== "form" && mode !== "generating" && (
          <button
            onClick={() => {
              setJobTitle("");
              setCompany("");
              setJobRawText("");
              setMode("form");
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-lg font-medium transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Generate New
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── History sidebar ──────────────────────────────────────────────── */}
        {letters.length > 0 && mode !== "generating" && (
          <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 px-1">
              History ({letters.length})
            </p>
            {letters.map((letter) => (
              <button
                key={letter.id}
                onClick={() => { setActiveLetter(letter); setMode("view"); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  activeLetter?.id === letter.id
                    ? "bg-amber-500/10 border-amber-500/40 text-white"
                    : "bg-[#1a1916] border-[#2d2a26] hover:border-amber-500/30 text-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{letter.job_title}</p>
                    {letter.company && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{letter.company}</p>
                    )}
                  </div>
                  <FileEdit className="w-4 h-4 shrink-0 text-gray-600 mt-0.5" />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {format(new Date(letter.created_at), "MMM d, yyyy")}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <div className={letters.length > 0 && mode !== "generating" ? "lg:col-span-2" : "lg:col-span-3"}>

          {/* Generating loader */}
          {mode === "generating" && (
            <div className="flex flex-col items-center justify-center py-24 gap-6 animate-fade-in-up">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping" />
                <div className="relative z-10 w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-semibold">Writing your cover letter…</p>
                <p className="text-gray-500 text-sm flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Usually takes 10–15 seconds
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          {mode === "form" && (
            <div className="bg-[#1a1916] border border-[#2d2a26] rounded-xl p-6 sm:p-8 space-y-6">
              {prefillAnalysis && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-300">
                  <Briefcase className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Pre-filled from your job analysis for <strong>{prefillAnalysis.job_title}</strong>.</span>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-amber-400" />
                      Job Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      Company <span className="text-gray-600 text-xs">(optional)</span>
                    </label>
                    <input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Stripe"
                      className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-green-400" />
                    Job Description <span className="text-gray-600 text-xs">(optional but improves quality)</span>
                  </label>
                  <textarea
                    rows={10}
                    value={jobRawText}
                    onChange={(e) => setJobRawText(e.target.value)}
                    placeholder="Paste the full job listing here…"
                    className="w-full bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!jobTitle.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-900 font-semibold rounded-lg transition-colors text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Cover Letter
                  </button>
                  {letters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMode(activeLetter ? "view" : "list")}
                      className="px-4 py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Letter view */}
          {mode === "view" && activeLetter && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
                    {activeLetter.job_title}
                    {activeLetter.company && (
                      <span className="text-gray-400 font-normal"> — {activeLetter.company}</span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Generated {format(new Date(activeLetter.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopy(activeLetter.content)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#2d2a26]/40 hover:bg-[#2d2a26] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#2d2a26]"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => handleDownload(activeLetter)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#2d2a26]/40 hover:bg-[#2d2a26] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#2d2a26]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    .txt
                  </button>
                  <ExportCoverLetterButton
                    jobTitle={activeLetter.job_title}
                    company={activeLetter.company}
                    content={activeLetter.content}
                  />
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#2d2a26]/40 hover:bg-[#2d2a26] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#2d2a26]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                  {activeLetter.job_analysis_id && (
                    <Link
                      href={`/jobs/${activeLetter.job_analysis_id}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#2d2a26]/40 hover:bg-[#2d2a26] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#2d2a26]"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      View Analysis
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(activeLetter.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Letter content */}
              <div className="bg-[#1a1916] border border-[#2d2a26] rounded-xl p-6 sm:p-8">
                <div className="prose prose-invert max-w-none">
                  <div
                    className="text-gray-200 text-sm leading-[1.9] whitespace-pre-wrap font-[system-ui]"
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  >
                    {activeLetter.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty state (no letters, not in form mode) */}
          {mode === "list" && letters.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border-2 border-dashed border-[#2d2a26] rounded-xl animate-fade-in-up">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <FileEdit className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h2 className="text-lg font-semibold text-white">No cover letters yet</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Generate your first cover letter from a job analysis, or start from scratch above.
                </p>
              </div>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-lg font-medium transition-colors text-sm"
              >
                Analyse a job first
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
