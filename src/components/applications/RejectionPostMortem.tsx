"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Brain, ChevronRight, Lightbulb, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { RejectionPostMortem as PostMortemType } from "@/types";

interface Props {
  applicationId: string;
  onDismiss: () => void;
  onAddToRoadmap: (suggestion: string) => void;
}

export function RejectionPostMortem({ applicationId, onDismiss, onAddToRoadmap }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [postMortem, setPostMortem] = useState<PostMortemType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications/post-mortem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate post-mortem");
      setPostMortem(data.postMortem);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToRoadmap = () => {
    if (!postMortem) return;
    onAddToRoadmap(postMortem.roadmap_update_suggestion);
    toast.success("Added to Career Ladder — refresh your roadmap to see it.");
    router.push("/career");
  };

  return (
    <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-sm font-semibold text-orange-300">Rejection Post-Mortem</span>
        </div>
        <button onClick={onDismiss} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!postMortem && !loading && !error && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            Get a quick AI analysis of what likely caused this rejection and what to do next.
          </p>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Brain className="w-3.5 h-3.5" />
            Analyse rejection
          </button>
        </div>
      )}

      {loading && (
        <div className="px-4 pb-4 flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Analysing rejection...
        </div>
      )}

      {error && (
        <div className="px-4 pb-4 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {postMortem && (
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wide">Most likely gap</p>
            <p className="text-sm text-gray-200 leading-relaxed">{postMortem.likely_gap}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">What similar candidates do</p>
            <p className="text-sm text-gray-300 leading-relaxed">{postMortem.similar_profiles_action}</p>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-300 mb-1">Add to Career Ladder</p>
              <p className="text-xs text-gray-400 leading-relaxed">{postMortem.roadmap_update_suggestion}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAddToRoadmap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Add to Career Ladder
            </button>
            <button
              onClick={onDismiss}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
