import Link from "next/link";
import { ClipboardList, ArrowRight, Plus } from "lucide-react";
import { Application, ApplicationStatus } from "@/types";
import { format } from "date-fns";

interface ApplicationsWidgetProps {
  applications: Application[];
}

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved:        "text-gray-400 bg-gray-500/10 border-gray-500/20",
  applied:      "text-blue-400 bg-blue-500/10 border-blue-500/20",
  interviewing: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  offered:      "text-green-400 bg-green-500/10 border-green-500/20",
  rejected:     "text-red-400 bg-red-500/10 border-red-500/20",
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved", applied: "Applied", interviewing: "Interviewing",
  offered: "Offered", rejected: "Rejected",
};

export function ApplicationsWidget({ applications }: ApplicationsWidgetProps) {
  // Compute counts per status
  const counts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  const recent = applications.slice(0, 3);

  return (
    <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 flex flex-col gap-5 sm:col-span-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Applications
          </h2>
        </div>
        <Link href="/applications" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E3A5F]/30">
            <Plus className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            No applications tracked yet — analyse a job listing and add it here.
          </p>
          <Link href="/jobs" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
            Analyse a job <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Status breakdown */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(counts) as [ApplicationStatus, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <span key={status} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                  {count} {STATUS_LABELS[status]}
                </span>
              ))}
          </div>

          {/* Recent applications */}
          <ul className="flex flex-col divide-y divide-[#1E3A5F]/50">
            {recent.map((app) => (
              <li key={app.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{app.job_title}</p>
                  {app.company && (
                    <p className="text-gray-500 text-xs truncate mt-0.5">{app.company}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[app.status]}`}>
                  {STATUS_LABELS[app.status]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
