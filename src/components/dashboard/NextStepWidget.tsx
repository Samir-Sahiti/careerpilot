import Link from "next/link";
import { ArrowRight, Circle, PlayCircle, Map } from "lucide-react";
import { RoadmapItem } from "@/types";

interface Props {
  nextItem: RoadmapItem | null;
  inProgressCount: number;
  doneCount: number;
  totalCount: number;
}

export function NextStepWidget({ nextItem, inProgressCount, doneCount, totalCount }: Props) {
  if (totalCount === 0) return null;

  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const ItemIcon = nextItem?.status === "in_progress" ? PlayCircle : Circle;
  const itemColor = nextItem?.status === "in_progress" ? "text-amber-400" : "text-gray-500";

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">Career Ladder</span>
        </div>
        <Link href="/career" className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{doneCount} of {totalCount} items done</span>
          <span className="text-amber-300 font-semibold">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div className="h-1.5 rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Next item */}
      {nextItem ? (
        <div className="flex items-start gap-2.5">
          <ItemIcon className={`w-4 h-4 shrink-0 mt-0.5 ${itemColor}`} />
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              {nextItem.status === "in_progress" ? "In Progress" : "Up Next"}
            </p>
            <p className="text-sm text-white font-medium mt-0.5">{nextItem.title}</p>
            {nextItem.description && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{nextItem.description}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-green-400 font-medium">All items complete!</p>
      )}

      {inProgressCount > 1 && (
        <p className="text-xs text-gray-600">{inProgressCount} items in progress</p>
      )}
    </div>
  );
}
