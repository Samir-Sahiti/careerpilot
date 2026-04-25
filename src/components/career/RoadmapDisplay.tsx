"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CareerRoadmap, RoadmapItem, RoadmapItemStatus } from "@/types";
import {
  BriefcaseBusiness,
  Clock,
  Lightbulb,
  Target,
  FolderGit2,
  RefreshCw,
  Map,
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  roadmap: CareerRoadmap;
  initialItems: RoadmapItem[];
}

const STATUS_CONFIG: Record<RoadmapItemStatus, { icon: typeof Circle; label: string; color: string }> = {
  not_started: { icon: Circle,       label: "Not started", color: "text-gray-500" },
  in_progress:  { icon: PlayCircle,  label: "In progress", color: "text-amber-400"  },
  done:         { icon: CheckCircle2, label: "Done",       color: "text-green-400" },
};

const NEXT_STATUS: Record<RoadmapItemStatus, RoadmapItemStatus> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
};

export function RoadmapDisplay({ roadmap, initialItems }: Props) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [items, setItems] = useState<RoadmapItem[]>(initialItems);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/career/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to refresh roadmap");
      }
      toast.success("Roadmap successfully updated!");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleItemStatus = async (item: RoadmapItem) => {
    const nextStatus = NEXT_STATUS[item.status];
    setUpdatingId(item.id);
    try {
      const res = await fetch("/api/career/roadmap-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated: RoadmapItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      toast.error("Failed to update item");
    } finally {
      setUpdatingId(null);
    }
  };

  const paths = roadmap.paths || [];

  // Progress summary
  const totalItems = items.length;
  const doneItems = items.filter((i) => i.status === "done").length;
  const progressPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-fade-in-up">

      {/* ── Hero / Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-[#1a1916] border border-[#2d2a26] rounded-3xl p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />

        <div className="space-y-4 relative z-10 flex-1">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium px-4 py-1.5 rounded-full">
            <Map className="w-4 h-4" />
            AI Career Roadmap
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Your Next Moves
          </h1>

          <p className="text-gray-400 max-w-xl text-lg relative pl-5 before:absolute before:inset-y-1 before:left-0 before:w-1 before:bg-amber-500 before:rounded-full">
            Based on your baseline profile as a <strong className="text-white font-semibold">{roadmap.current_role}</strong>.
          </p>

          {/* Progress bar */}
          {totalItems > 0 && (
            <div className="space-y-1.5 max-w-sm">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{doneItems} of {totalItems} items complete</span>
                <span className="text-amber-300 font-semibold">{progressPct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative z-10 shrink-0 flex flex-col items-start md:items-end gap-3 mt-6 md:mt-0">
          <p className="text-xs text-gray-500 font-medium">
            Generated {format(new Date(roadmap.created_at), "MMM d, yyyy")}
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-900 rounded-xl font-medium transition-all shadow-lg shadow-amber-900/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Regenerating..." : "Refresh Roadmap"}
          </button>
        </div>
      </div>

      {/* ── Living Items (tracked skills + projects) ──────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Your Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              const Icon = cfg.icon;
              const isUpdating = updatingId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItemStatus(item)}
                  disabled={isUpdating}
                  className={`group text-left p-4 rounded-xl border transition-all ${
                    item.status === "done"
                      ? "bg-green-500/5 border-green-500/20 opacity-70"
                      : item.status === "in_progress"
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-[#1a1916] border-[#2d2a26] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color} ${isUpdating ? "animate-pulse" : ""}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium leading-tight ${item.status === "done" ? "line-through text-gray-500" : "text-white"}`}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                      )}
                      <span className={`text-[10px] font-semibold uppercase tracking-wide mt-1.5 block ${cfg.color}`}>
                        {item.item_type} · {cfg.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-600">Click any item to cycle its status: Not started → In progress → Done.</p>
        </div>
      )}

      {/* ── Paths Grid ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Career Paths</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {paths.map((path, idx) => {
            const isExpanded = expandedIdx === idx;
            return (
              <div
                key={idx}
                className={`bg-[#0f0e0c] border ${isExpanded ? "border-blue-500 shadow-lg shadow-blue-500/10" : "border-[#2d2a26] hover:border-amber-500/40"} rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300`}
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="p-6 sm:p-8 text-left w-full relative z-10 group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 space-y-4">
                    <span className={`inline-block px-3 py-1 bg-[#1a1916] border ${isExpanded ? "border-blue-500 text-amber-300" : "border-gray-700 text-gray-300"} text-xs font-bold uppercase tracking-widest rounded-md transition-colors`}>
                      {path.path_title}
                    </span>
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Target className="w-6 h-6 text-amber-400 shrink-0" />
                        {path.next_role}
                      </h2>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[2000px] opacity-100 border-t border-gray-800" : "max-h-0 opacity-0"}`}>
                  <div className="p-6 sm:p-8 pt-0 space-y-8 mt-6">
                    <div className="bg-[#1a1916] rounded-xl p-5 border border-gray-800 space-y-3">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold">
                        <Clock className="w-4 h-4" />
                        Expected Timeline: {path.timeline_estimate}
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        <strong className="text-gray-300">Experience Needed:</strong> {path.experience_needed}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        Missing Skills to Acquire
                      </h3>
                      <div className="space-y-3 mt-2">
                        {path.missing_skills?.map((skillDetail: string, i: number) => {
                          const splitIdx = skillDetail.indexOf(":");
                          if (splitIdx > 0) {
                            const skillName = skillDetail.substring(0, splitIdx).trim();
                            const context = skillDetail.substring(splitIdx + 1).trim();
                            return (
                              <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                                <span className="text-amber-400 font-bold block mb-1 text-sm">{skillName}</span>
                                <span className="text-gray-400 text-sm leading-relaxed block">{context}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-sm text-gray-400 leading-relaxed">
                              {skillDetail}
                            </div>
                          );
                        })}
                        {(!path.missing_skills || path.missing_skills.length === 0) && (
                          <span className="text-sm text-gray-500 italic">None identified.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 mt-auto">
                      <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-purple-400" />
                        Actionable Milestones
                      </h3>
                      <ul className="space-y-3 mt-2">
                        {path.recommended_projects?.map((proj: string, i: number) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-3 leading-relaxed bg-[#1a1916] p-4 rounded-lg border border-gray-800">
                            <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                            <span>{proj}</span>
                          </li>
                        ))}
                        {(!path.recommended_projects || path.recommended_projects.length === 0) && (
                          <li className="text-sm text-gray-500 italic border border-transparent p-4">No specific projects recommended.</li>
                        )}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-gray-800">
                      <button
                        onClick={() => router.push(`/jobs?target_role=${encodeURIComponent(path.next_role)}`)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1a1916] border border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500 text-amber-400 transition-colors font-semibold rounded-lg text-sm"
                      >
                        <BriefcaseBusiness className="w-4 h-4" />
                        Find jobs at this level
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
