"use client";

import { InterviewSession } from "@/types";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface QuestionEntry {
  type: "behavioral" | "technical" | "role-specific";
  score: number;
  sessionDate: string;
}

interface TypeStats {
  type: "behavioral" | "technical" | "role-specific";
  label: string;
  entries: QuestionEntry[];
  avg: number;
  trend: number; // positive = improving, negative = declining, 0 = flat
  color: string;
  bg: string;
}

function computeSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  behavioral:    { label: "Behavioral",    color: "text-blue-400",   bg: "bg-blue-500"   },
  technical:     { label: "Technical",     color: "text-purple-400", bg: "bg-purple-500" },
  "role-specific": { label: "Role-Specific", color: "text-amber-400",  bg: "bg-amber-500"  },
};

interface Props {
  sessions: InterviewSession[];
}

export function ProgressView({ sessions }: Props) {
  // Flatten all scored questions across sessions, keyed by type
  const entriesByType: Record<string, QuestionEntry[]> = {};

  for (const session of sessions) {
    for (const q of session.questions) {
      if (q.score == null) continue;
      const type = q.type;
      if (!entriesByType[type]) entriesByType[type] = [];
      entriesByType[type].push({
        type,
        score: q.score,
        sessionDate: session.created_at,
      });
    }
  }

  const typeStats: TypeStats[] = Object.entries(entriesByType).map(([type, entries]) => {
    const scores = entries.map((e) => e.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const slope = computeSlope(scores);
    const cfg = TYPE_CONFIG[type] ?? { label: type, color: "text-gray-400", bg: "bg-gray-500" };
    return { type: type as TypeStats["type"], ...cfg, entries, avg, trend: slope };
  });

  // Session-level overall scores over time
  const scoredSessions = sessions
    .filter((s) => s.overall_score != null)
    .slice(-12);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-gray-600" />
        <p className="text-gray-400 text-sm">No interview sessions yet. Complete a session to see your progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Per-type trend cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {typeStats.map((stat) => {
          const TrendIcon = stat.trend > 2 ? TrendingUp : stat.trend < -2 ? TrendingDown : Minus;
          const trendColor = stat.trend > 2 ? "text-green-400" : stat.trend < -2 ? "text-red-400" : "text-gray-400";
          const lastFew = stat.entries.slice(-6);

          return (
            <div key={stat.type} className="rounded-xl border border-white/5 bg-[#111827] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${stat.color}`}>{stat.label}</span>
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              </div>

              <div>
                <p className="text-3xl font-bold text-white">{stat.avg}</p>
                <p className="text-xs text-gray-500 mt-0.5">avg score ({stat.entries.length} answers)</p>
              </div>

              {/* Mini sparkline */}
              <div className="flex items-end gap-1 h-12">
                {lastFew.map((entry, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className={`w-full rounded-sm ${stat.bg} opacity-80 transition-all`}
                      style={{ height: `${Math.max(4, (entry.score / 100) * 100)}%` }}
                      title={`Score: ${entry.score}`}
                    />
                  </div>
                ))}
              </div>

              {/* Insight */}
              {stat.trend > 5 && (
                <p className="text-xs text-green-400">Improving — keep going.</p>
              )}
              {stat.trend < -5 && (
                <p className="text-xs text-amber-400">Scores slipping — try a focused session.</p>
              )}
              {Math.abs(stat.trend) <= 5 && stat.entries.length >= 4 && (
                <p className="text-xs text-gray-500">Plateau — mix up practice formats.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Session overall score history */}
      {scoredSessions.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#111827] p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Overall Score History</h3>
          <div className="flex items-end gap-2 h-28">
            {scoredSessions.map((session, i) => {
              const score = session.overall_score ?? 0;
              const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-600 font-mono">{score}</span>
                  <div
                    className={`w-full rounded-t ${color} transition-all`}
                    style={{ height: `${score}%` }}
                    title={`Score: ${score} — ${new Date(session.created_at).toLocaleDateString()}`}
                  />
                  <span className="text-[8px] text-gray-700">
                    {new Date(session.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
