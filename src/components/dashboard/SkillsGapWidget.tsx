import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import { JobAnalysis, CareerRoadmap } from "@/types";

interface SkillsGapWidgetProps {
  jobs: JobAnalysis[];
  roadmap: CareerRoadmap | null;
}

export function SkillsGapWidget({ jobs, roadmap }: SkillsGapWidgetProps) {
  // Aggregate missing skills from job analyses and roadmap
  const skillCounts = new Map<string, number>();

  for (const job of jobs) {
    for (const skill of job.missing_skills ?? []) {
      const normalized = skill.trim().toLowerCase();
      if (normalized) skillCounts.set(normalized, (skillCounts.get(normalized) ?? 0) + 1);
    }
  }

  if (roadmap) {
    for (const path of roadmap.paths ?? []) {
      for (const skill of path.missing_skills ?? []) {
        // Skills in roadmap are formatted as "Skill Name: reason" — extract just the name
        const name = skill.split(":")[0].trim().toLowerCase();
        if (name) skillCounts.set(name, (skillCounts.get(name) ?? 0) + 1);
      }
    }
  }

  const topSkills = Array.from(skillCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({
      skill: skill.charAt(0).toUpperCase() + skill.slice(1),
      count,
    }));

  const maxCount = topSkills[0]?.count ?? 1;

  if (topSkills.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#111827] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h2 className="font-semibold text-white">Skills Gap</h2>
        </div>
        <p className="text-sm text-gray-500">
          Analyze some jobs to see which skills appear most in your gaps.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 bg-[#111827] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h2 className="font-semibold text-white">Skills Gap</h2>
        </div>
        <Link
          href="/jobs"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors"
        >
          Analyze more <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2.5">
        {topSkills.map(({ skill, count }) => (
          <div key={skill}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-300">{skill}</span>
              <span className="text-gray-500">{count}×</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/5">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
