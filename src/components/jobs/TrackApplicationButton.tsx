"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Check, Loader2 } from "lucide-react";

interface Props {
  jobAnalysisId: string;
  jobTitle: string;
  company: string | null;
}

export function TrackApplicationButton({ jobAnalysisId, jobTitle, company }: Props) {
  const [tracked, setTracked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (tracked || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_analysis_id: jobAnalysisId,
          job_title: jobTitle,
          company: company || undefined,
          status: "saved",
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to track");
      }
      setTracked(true);
      toast.success("Added to Application Tracker!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add to tracker";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTrack}
      disabled={loading || tracked}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all text-sm border ${
        tracked
          ? "bg-green-500/10 border-green-500/30 text-green-400 cursor-default"
          : "bg-[#1a1916] border-[#2d2a26] hover:border-amber-500/50 hover:bg-[#2d2a26]/30 text-gray-300"
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : tracked ? <Check className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
      {tracked ? "Tracked!" : "Track Application"}
    </button>
  );
}
