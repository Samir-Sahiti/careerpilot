import Link from "next/link";
import { TrendingUp, ArrowRight, MapPin } from "lucide-react";
import { CareerRoadmap } from "@/types";

interface CareerRoadmapWidgetProps {
  roadmap: CareerRoadmap | null;
}

export function CareerRoadmapWidget({ roadmap }: CareerRoadmapWidgetProps) {
  return (
    <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Career Roadmap
          </h2>
        </div>
        <Link
          href="/career"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      {roadmap ? (
        <div className="flex flex-col gap-4">
          {/* Route visualisation */}
          <div className="bg-[#0A0F1C] border border-[#1E3A5F]/60 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Current role */}
            <div className="flex-1 min-w-0">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1 font-medium">Current</p>
              <p className="text-white text-sm font-semibold truncate">{roadmap.current_role}</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-1 text-blue-500 shrink-0">
              <div className="w-8 h-[2px] bg-blue-500/40 hidden sm:block" />
              <ArrowRight className="w-5 h-5" />
              <div className="w-8 h-[2px] bg-blue-500/40 hidden sm:block" />
            </div>

            {/* Target role */}
            <div className="flex-1 min-w-0 text-right sm:text-right">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1 font-medium">Target</p>
              <p className="text-green-400 text-sm font-semibold truncate">{roadmap.target_role}</p>
            </div>
          </div>

          {/* Steps count */}
          <p className="text-gray-500 text-xs">
            {roadmap.steps.length} step{roadmap.steps.length !== 1 ? "s" : ""} in your roadmap
          </p>

          <Link
            href="/career"
            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            View full roadmap →
          </Link>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-start gap-4 py-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E3A5F]/30">
            <MapPin className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            No roadmap yet — generate yours from your CV to chart your path forward.
          </p>
          <Link
            href="/career"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Generate your roadmap <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
