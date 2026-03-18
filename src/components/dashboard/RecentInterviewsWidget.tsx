import Link from "next/link";
import { MessageSquare, ArrowRight, Mic } from "lucide-react";
import { InterviewSession, InterviewQuestion } from "@/types";
import { format } from "date-fns";

interface RecentInterviewsWidgetProps {
  sessions: InterviewSession[];
}

/** Compute average score from graded questions, returns null if no graded answers yet */
function computeOverallScore(questions: InterviewQuestion[]): number | null {
  const graded = questions.filter((q) => q.score !== null);
  if (graded.length === 0) return null;
  const sum = graded.reduce((acc, q) => acc + (q.score ?? 0), 0);
  // scores are 0-10 per question, display as percentage
  return Math.round((sum / (graded.length * 10)) * 100);
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-xs font-medium text-gray-500 bg-[#1E3A5F]/30 px-2 py-0.5 rounded-full">
        In progress
      </span>
    );
  }
  const colour =
    score >= 75
      ? "text-green-400 bg-green-500/10 border border-green-500/20"
      : score >= 50
      ? "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20"
      : "text-red-400 bg-red-500/10 border border-red-500/20";

  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colour}`}>
      {score}%
    </span>
  );
}

export function RecentInterviewsWidget({ sessions }: RecentInterviewsWidgetProps) {
  return (
    <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-400" />
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Recent Interviews
          </h2>
        </div>
        <Link
          href="/interview"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      {sessions.length > 0 ? (
        <ul className="flex flex-col divide-y divide-[#1E3A5F]/50">
          {sessions.map((session) => {
            const score = computeOverallScore(session.questions);
            return (
              <li key={session.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium">
                    Practice session
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {format(new Date(session.created_at), "MMM d, yyyy")} ·{" "}
                    {session.questions.length} questions
                  </p>
                </div>
                <ScoreBadge score={score} />
              </li>
            );
          })}
        </ul>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-start gap-4 py-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E3A5F]/30">
            <Mic className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            No interviews practised yet — start with a job analysis to generate tailored questions.
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Start with a job analysis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
