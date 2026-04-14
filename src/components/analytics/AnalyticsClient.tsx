"use client";

import { Application, JobAnalysis, InterviewSession } from "@/types";
import { BarChart2, Briefcase, MessageSquare, TrendingUp } from "lucide-react";

interface Props {
  applications: Application[];
  jobs: JobAnalysis[];
  interviews: InterviewSession[];
}

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-gray-500",
  applied: "bg-blue-500",
  interviewing: "bg-yellow-500",
  offered: "bg-green-500",
  rejected: "bg-red-500",
};

export function AnalyticsClient({ applications, jobs, interviews }: Props) {
  // Application funnel
  const statusCounts = applications.reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] ?? 0) + 1;
    return acc;
  }, {});

  // Avg fit score
  const scoredJobs = jobs.filter((j) => j.fit_score !== null);
  const avgFitScore =
    scoredJobs.length > 0
      ? Math.round(scoredJobs.reduce((sum, j) => sum + (j.fit_score ?? 0), 0) / scoredJobs.length)
      : null;

  // Avg interview score
  const scoredInterviews = interviews.filter((i) => i.overall_score !== null);
  const avgInterviewScore =
    scoredInterviews.length > 0
      ? Math.round(
          scoredInterviews.reduce((sum, i) => sum + (i.overall_score ?? 0), 0) /
            scoredInterviews.length
        )
      : null;

  // Recommendation breakdown
  const recCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    if (j.recommendation) acc[j.recommendation] = (acc[j.recommendation] ?? 0) + 1;
    return acc;
  }, {});

  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1 text-sm">
          An overview of your job search activity and performance.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Applications", value: applications.length, icon: Briefcase, color: "text-blue-400" },
          { label: "Jobs Analyzed", value: jobs.length, icon: BarChart2, color: "text-purple-400" },
          { label: "Avg Fit Score", value: avgFitScore !== null ? `${avgFitScore}%` : "—", icon: TrendingUp, color: "text-yellow-400" },
          { label: "Avg Interview Score", value: avgInterviewScore !== null ? `${avgInterviewScore}%` : "—", icon: MessageSquare, color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-[#111827] p-5">
            <Icon className={`h-5 w-5 mb-3 ${color}`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Application funnel */}
        <div className="rounded-xl border border-white/5 bg-[#111827] p-6">
          <h2 className="font-semibold text-white mb-4">Application Funnel</h2>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500">No applications tracked yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const count = statusCounts[status] ?? 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{label}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5">
                      <div
                        className={`h-2 rounded-full transition-all ${STATUS_COLORS[status]}`}
                        style={{ width: `${(count / maxStatusCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Job recommendation breakdown */}
        <div className="rounded-xl border border-white/5 bg-[#111827] p-6">
          <h2 className="font-semibold text-white mb-4">Job Recommendation Breakdown</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No jobs analyzed yet.</p>
          ) : (
            <div className="space-y-4">
              {[
                { key: "apply", label: "Apply", color: "text-green-400", bg: "bg-green-500" },
                { key: "maybe", label: "Maybe", color: "text-yellow-400", bg: "bg-yellow-500" },
                { key: "skip", label: "Skip", color: "text-red-400", bg: "bg-red-500" },
              ].map(({ key, label, color, bg }) => {
                const count = recCounts[key] ?? 0;
                const pct = jobs.length > 0 ? Math.round((count / jobs.length) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`w-16 text-xs font-medium ${color}`}>{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/5">
                      <div className={`h-2 rounded-full ${bg}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interview score trend (simple list) */}
      {scoredInterviews.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#111827] p-6">
          <h2 className="font-semibold text-white mb-4">Interview Score History</h2>
          <div className="flex items-end gap-2 h-24">
            {scoredInterviews.slice(-12).map((session, i) => {
              const score = session.overall_score ?? 0;
              const color =
                score >= 75 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${color} transition-all`}
                    style={{ height: `${score}%` }}
                    title={`Score: ${score}`}
                  />
                  <span className="text-[9px] text-gray-600">
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
