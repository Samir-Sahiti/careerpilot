"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CareerRoadmap } from "@/types";
import { 
  BriefcaseBusiness, 
  Clock, 
  Lightbulb, 
  Target, 
  FolderGit2, 
  RefreshCw, 
  Map, 
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export function RoadmapDisplay({ roadmap }: { roadmap: CareerRoadmap }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/career/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true })
      });
      
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to refresh roadmap");
      }
      
      toast.success("Roadmap successfully updated!");
      router.refresh(); // Automatically re-fetches the Server Component and passes the new rows down
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRefreshing(false);
    }
  };

  const paths = roadmap.paths || [];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-fade-in-up">
      
      {/* ── Hero / Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-[#111827] border border-[#1E3A5F] rounded-3xl p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        
        <div className="space-y-4 relative z-10 flex-1">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium px-4 py-1.5 rounded-full">
            <Map className="w-4 h-4" />
            AI Career Roadmap
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Your Next Moves
          </h1>
          
          <p className="text-gray-400 max-w-xl text-lg relative pl-5 before:absolute before:inset-y-1 before:left-0 before:w-1 before:bg-blue-600 before:rounded-full">
            Based on your baseline profile as a <strong className="text-white font-semibold">{roadmap.current_role}</strong>.
          </p>
        </div>

        <div className="relative z-10 shrink-0 flex flex-col items-start md:items-end gap-3 mt-6 md:mt-0">
          <p className="text-xs text-gray-500 font-medium">
            Generated {format(new Date(roadmap.created_at), "MMM d, yyyy")}
          </p>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Regenerating..." : "Refresh Roadmap"}
          </button>
        </div>
      </div>

      {/* ── Paths Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {paths.map((path, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div 
              key={idx} 
              className={`bg-[#0A0F1C] border ${isExpanded ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-[#1E3A5F] hover:border-blue-500/40'} rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300`}
            >
              {/* Header (Clickable) */}
              <button 
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="p-6 sm:p-8 text-left w-full relative z-10 group cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10 space-y-4">
                  <span className={`inline-block px-3 py-1 bg-[#111827] border ${isExpanded ? 'border-blue-500 text-blue-300' : 'border-gray-700 text-gray-300'} text-xs font-bold uppercase tracking-widest rounded-md transition-colors`}>
                    {path.path_title}
                  </span>
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Target className="w-6 h-6 text-blue-400 shrink-0" />
                      {path.next_role}
                    </h2>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center border border-gray-800">
                       <span className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expandable Body */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100 border-t border-gray-800' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-6 sm:p-8 pt-0 space-y-8 mt-6">
                  {/* Timeline & Experience Block */}
                  <div className="bg-[#111827] rounded-xl p-5 border border-gray-800 space-y-3">
                    <div className="flex items-center gap-2 text-blue-300 font-semibold">
                      <Clock className="w-4 h-4" />
                      Expected Timeline: {path.timeline_estimate}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      <strong className="text-gray-300">Experience Needed:</strong> {path.experience_needed}
                    </p>
                  </div>

                  {/* Skills Gap (Detailed) */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      Missing Skills to Acquire
                    </h3>
                    <div className="space-y-3 mt-2">
                      {path.missing_skills?.map((skillDetail: string, i: number) => {
                        // Attempt to parse "Skill: Context" if it came back like that
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

                  {/* Recommended Projects (Detailed) */}
                  <div className="space-y-4 mt-auto">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-purple-400" />
                      Actionable Milestones
                    </h3>
                    <ul className="space-y-3 mt-2">
                      {path.recommended_projects?.map((proj: string, i: number) => (
                        <li key={i} className="text-sm text-gray-400 flex items-start gap-3 leading-relaxed bg-[#111827] p-4 rounded-lg border border-gray-800">
                          <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0" />
                          <span>{proj}</span>
                        </li>
                      ))}
                      {(!path.recommended_projects || path.recommended_projects.length === 0) && (
                        <li className="text-sm text-gray-500 italic border border-transparent p-4">No specific projects recommended.</li>
                      )}
                    </ul>
                  </div>

                  {/* CTA Action */}
                  <div className="pt-4 border-t border-gray-800">
                    <button
                      onClick={() => router.push(`/jobs?target_role=${encodeURIComponent(path.next_role)}`)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#111827] border border-blue-500/30 hover:bg-blue-600/10 hover:border-blue-500 text-blue-400 transition-colors font-semibold rounded-lg text-sm"
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
  );
}
