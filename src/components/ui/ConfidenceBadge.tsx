"use client";

import { useState } from "react";
import { FitScoreBasis } from "@/types";

const CONFIG: Record<FitScoreBasis, { label: string; dot: string; tooltip: string }> = {
  explicit: {
    label: "Grounded",
    dot: "bg-green-400",
    tooltip: "Score based on explicitly matched requirements.",
  },
  inferred: {
    label: "Inferred",
    dot: "bg-yellow-400",
    tooltip: "Some requirements or seniority were inferred from context.",
  },
  speculative: {
    label: "Speculative",
    dot: "bg-orange-400",
    tooltip: "Significant ambiguity in the listing or profile — treat with caution.",
  },
};

interface ConfidenceBadgeProps {
  basis: FitScoreBasis;
  rationale?: string | null;
}

export function ConfidenceBadge({ basis, rationale }: ConfidenceBadgeProps) {
  const [open, setOpen] = useState(false);
  const cfg = CONFIG[basis];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
      >
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 pointer-events-none">
          <div className="bg-[#0f0e0c] border border-[#2d2a26] rounded-lg p-3 shadow-xl text-xs text-gray-300 leading-relaxed">
            <p className="font-semibold text-white mb-1">{cfg.label} score</p>
            <p>{rationale || cfg.tooltip}</p>
          </div>
          <div className="w-2 h-2 bg-[#0f0e0c] border-r border-b border-[#2d2a26] rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
