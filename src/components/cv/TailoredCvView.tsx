"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2, ChevronDown, ChevronUp, Printer, CheckCircle2, Info, X } from "lucide-react";
import { ParsedCvData, TailoredCv } from "@/types";

interface Props {
  jobAnalysisId: string;
  originalCv: ParsedCvData;
  initialTailored?: TailoredCv & { tailoring_notes?: string[]; summary?: string };
}

export function TailoredCvView({ jobAnalysisId, originalCv, initialTailored }: Props) {
  const [tailored, setTailored] = useState(initialTailored ?? null);
  const [tailoringNotes, setTailoringNotes] = useState<string[]>(initialTailored?.tailoring_notes ?? []);
  const [summary, setSummary] = useState<string>(initialTailored?.summary ?? "");
  const [loading, setLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [view, setView] = useState<"tailored" | "original">("tailored");

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cv/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobAnalysisId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tailoring failed");
      setTailored(data);
      setTailoringNotes(data.tailoring_notes ?? []);
      setSummary(data.summary ?? "");
      setView("tailored");
      toast.success("CV tailored for this role");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to tailor CV");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => window.print();

  const displayCv: ParsedCvData = view === "tailored" && tailored ? tailored.tailored_data : originalCv;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {tailored ? "Re-tailor" : "Tailor CV for this role"}
          </button>

          {tailored && (
            <>
              <div className="flex rounded-lg border border-[#1E3A5F] overflow-hidden">
                <button
                  onClick={() => setView("tailored")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "tailored" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Tailored
                </button>
                <button
                  onClick={() => setView("original")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === "original" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Original
                </button>
              </div>
              <button
                onClick={() => setShowNotes((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                {showNotes ? "Hide" : "Show"} changes
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </>
          )}
        </div>
        {tailored && (
          <button
            onClick={exportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#2A4B75] text-gray-300 hover:text-white border border-[#1E3A5F] rounded-lg text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Export PDF
          </button>
        )}
      </div>

      {/* Tailoring notes */}
      {showNotes && tailoringNotes.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">What was changed</p>
            <button onClick={() => setShowNotes(false)} className="text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {tailoringNotes.map((note, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!tailored && !loading && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Click &quot;Tailor CV for this role&quot; to generate a version of your CV optimised for this specific job.
        </div>
      )}

      {/* CV Preview */}
      {tailored && (
        <div className="bg-white text-gray-900 rounded-xl p-6 sm:p-8 space-y-6 print:shadow-none" id="tailored-cv-print">
          {/* Summary */}
          {view === "tailored" && summary && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Professional Summary</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Skills */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {displayCv.skills.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium">{skill}</span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Experience</h2>
            <div className="space-y-4">
              {displayCv.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-sm text-gray-900">{exp.title}</p>
                    <span className="text-xs text-gray-500">{exp.duration}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{exp.company}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{exp.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          {displayCv.education.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Education</h2>
              <div className="space-y-1">
                {displayCv.education.map((edu, i) => (
                  <div key={i}>
                    <span className="text-sm font-medium text-gray-900">{edu.degree}</span>
                    <span className="text-xs text-gray-500"> — {edu.institution}{edu.year ? `, ${edu.year}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
