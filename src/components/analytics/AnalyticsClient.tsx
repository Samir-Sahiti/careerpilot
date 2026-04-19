"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Application, JobAnalysis, InterviewSession } from "@/types";
import { BarChart2, Briefcase, MessageSquare, TrendingUp, Users, ArrowRight } from "lucide-react";

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

interface CohortResponse {
  cohort: { seniority_level: string; role_family: string; experience_bracket: string } | null;
  stats: {
    member_count: number;
    avg_fit_score: number | null;
    response_rate_pct: number | null;
    offer_rate_pct: number | null;
  } | null;
  user_stats: { applied_count: number; response_rate: number | null; offer_rate: number | null };
  insufficient_data: boolean;
}

export function AnalyticsClient({ applications, jobs, interviews }: Props) {
  const [cohortData, setCohortData] = useState<CohortResponse | null>(null);

  useEffect(() => {
    fetch("/api/analytics/cohort")
      .then((r) => r.json())
      .then(setCohortData)
      .catch(() => {});
  }, []);

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

  // T2-1: AI Calibration — compare fit scores at application to outcomes
  const outcomedApps = applications.filter(
    (a) => a.outcome_fit_score_at_apply != null && a.outcome_stage_reached != null
  );
  const positiveOutcomes = outcomedApps.filter((a) => a.outcome_stage_reached !== "no_response");
  const noResponseOutcomes = outcomedApps.filter((a) => a.outcome_stage_reached === "no_response");
  const avgScorePositive =
    positiveOutcomes.length > 0
      ? Math.round(positiveOutcomes.reduce((s, a) => s + (a.outcome_fit_score_at_apply ?? 0), 0) / positiveOutcomes.length)
      : null;
  const avgScoreNoResponse =
    noResponseOutcomes.length > 0
      ? Math.round(noResponseOutcomes.reduce((s, a) => s + (a.outcome_fit_score_at_apply ?? 0), 0) / noResponseOutcomes.length)
      : null;
  const calibrationDrift =
    avgScorePositive != null && avgScoreNoResponse != null && avgFitScore != null
      ? avgFitScore - Math.round((avgScorePositive + avgScoreNoResponse) / 2)
      : null;

  // T2-3: Top rejection patterns — aggregate missing_skills from rejected applications
  const rejectedWithAnalysis = applications
    .filter((a) => a.status === "rejected" && a.job_analysis_id)
    .map((a) => jobs.find((j) => j.id === a.job_analysis_id))
    .filter(Boolean) as JobAnalysis[];

  const skillFrequency: Record<string, number> = {};
  for (const job of rejectedWithAnalysis) {
    for (const skill of job.missing_skills ?? []) {
      skillFrequency[skill] = (skillFrequency[skill] ?? 0) + 1;
    }
  }
  const topRejectionSkills = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1 text-sm">
            An overview of your job search activity and performance.
          </p>
        </div>
        <Link
          href="/interview/progress"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] border border-white/10 hover:border-blue-500/40 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
        >
          <BarChart2 className="w-4 h-4 text-blue-400" />
          Interview Progress
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Applications", value: applications.length, icon: Briefcase, color: "text-blue-400" },
          { label: "Jobs Analyzed", value: jobs.length, icon: BarChart2, color: "text-purple-400" },
          { label: "Avg Fit Score", value: avgFitScore !== null ? `${avgFitScore}%` : "—", icon: TrendingUp, color: "text-yellow-400" },
          { label: "Avg Interview Score", value: avgInterviewScore !== null ? `${avgInterviewScore}%` : "—", icon: MessageSquare, color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-5">
            <Icon className={`h-5 w-5 mb-3 ${color}`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Application funnel */}
        <div className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-6">
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
        <div className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-6">
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

      {/* Interview score trend */}
      {scoredInterviews.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Interview Score History</h2>
            <Link href="/interview/progress" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              View by type →
            </Link>
          </div>
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

      {/* T2-1: AI Calibration */}
      {outcomedApps.length >= 3 && (
        <div className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-6">
          <h2 className="font-semibold text-white mb-1">Your AI Calibration</h2>
          <p className="text-xs text-gray-500 mb-4">
            How accurate have fit score predictions been compared to your real outcomes?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {avgScorePositive != null && (
              <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-4">
                <p className="text-2xl font-bold text-green-400">{avgScorePositive}</p>
                <p className="text-xs text-gray-500 mt-1">Avg score when you got a response</p>
              </div>
            )}
            {avgScoreNoResponse != null && (
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-4">
                <p className="text-2xl font-bold text-red-400">{avgScoreNoResponse}</p>
                <p className="text-xs text-gray-500 mt-1">Avg score on no-response applications</p>
              </div>
            )}
            {calibrationDrift != null && (
              <div className={`rounded-lg border p-4 ${Math.abs(calibrationDrift) > 10 ? "bg-amber-500/5 border-amber-500/10" : "bg-white/5 border-white/10"}`}>
                <p className={`text-2xl font-bold ${Math.abs(calibrationDrift) > 10 ? "text-amber-400" : "text-white"}`}>
                  {calibrationDrift > 0 ? `+${calibrationDrift}` : calibrationDrift}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.abs(calibrationDrift) > 10
                    ? calibrationDrift > 0
                      ? "Scores tend to over-predict — be selective"
                      : "Scores tend to under-predict — apply more boldly"
                    : "Calibration looks accurate"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* T2-3: Top rejection patterns */}
      {topRejectionSkills.length >= 2 && (
        <div className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-6">
          <h2 className="font-semibold text-white mb-1">Top Rejection Patterns</h2>
          <p className="text-xs text-gray-500 mb-4">
            Skills most often missing on rejected applications.
          </p>
          <div className="space-y-3">
            {topRejectionSkills.map(([skill, count]) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-sm text-gray-300 flex-1 truncate">{skill}</span>
                <span className="text-xs text-red-400 font-semibold">{count} rejection{count > 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            <Link href="/career" className="text-blue-400 hover:text-blue-300 transition-colors">Add these to your Career Ladder →</Link>
          </p>
        </div>
      )}

      {/* T2-5: Cohort benchmarking */}
      {cohortData && (
        <div className="rounded-xl border border-white/5 bg-[var(--card-bg,#111827)] p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-400" />
            <h2 className="font-semibold text-white">Benchmarks</h2>
          </div>
          {cohortData.cohort && (
            <p className="text-xs text-gray-500 mb-4">
              Your cohort: {cohortData.cohort.seniority_level} {cohortData.cohort.role_family} · {cohortData.cohort.experience_bracket} yrs experience
            </p>
          )}

          {cohortData.insufficient_data ? (
            <p className="text-sm text-gray-500">
              Cohort benchmarks are shown once your peer group has enough members (≥20). Check back as the platform grows.
            </p>
          ) : cohortData.stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cohortData.user_stats.response_rate != null && cohortData.stats.response_rate_pct != null && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Response rate</p>
                  <p className="text-xl font-bold text-white">{cohortData.user_stats.response_rate}%</p>
                  <p className="text-xs text-gray-600">Cohort avg: {Math.round(cohortData.stats.response_rate_pct)}%</p>
                  {cohortData.user_stats.response_rate > cohortData.stats.response_rate_pct && (
                    <p className="text-xs text-green-400">Above cohort avg</p>
                  )}
                  {cohortData.user_stats.response_rate < cohortData.stats.response_rate_pct && (
                    <p className="text-xs text-amber-400">Below cohort avg</p>
                  )}
                </div>
              )}
              {cohortData.user_stats.offer_rate != null && cohortData.stats.offer_rate_pct != null && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Offer rate</p>
                  <p className="text-xl font-bold text-white">{cohortData.user_stats.offer_rate}%</p>
                  <p className="text-xs text-gray-600">Cohort avg: {Math.round(cohortData.stats.offer_rate_pct)}%</p>
                </div>
              )}
              {cohortData.stats.avg_fit_score != null && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Cohort avg fit score</p>
                  <p className="text-xl font-bold text-white">{Math.round(cohortData.stats.avg_fit_score)}</p>
                  <p className="text-xs text-gray-600">{cohortData.stats.member_count} members</p>
                </div>
              )}
            </div>
          ) : null}
          <p className="text-xs text-gray-600 mt-4">
            Aggregate-only data. <Link href="/settings" className="text-blue-400 hover:text-blue-300 transition-colors">Opt out in Settings →</Link>
          </p>
        </div>
      )}
    </div>
  );
}
