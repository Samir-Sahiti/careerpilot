import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FitScoreArc } from "@/components/jobs/FitScoreArc";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Briefcase, FileText, Target, ShieldAlert, CheckCircle2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InterviewResultsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .select("*, job_analyses(id, job_title, company)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !session) notFound();

  const questions: any[] = Array.isArray(session.questions) ? session.questions : [];
  
  // Calculate weak areas based on average score < 60 grouped by 'type'
  const typeScores: Record<string, { sum: number; count: number }> = {};
  
  questions.forEach((q) => {
    if (q.score !== null && q.score !== undefined) {
      if (!typeScores[q.type]) typeScores[q.type] = { sum: 0, count: 0 };
      typeScores[q.type].sum += q.score as number;
      typeScores[q.type].count++;
    }
  });

  const weakAreas: string[] = [];
  Object.entries(typeScores).forEach(([type, data]) => {
    if (data.count > 0 && Math.round(data.sum / data.count) < 60) {
      weakAreas.push(type);
    }
  });

  const jobInfo = session.job_analyses;
  const overallScore = session.overall_score || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-fade-in-up">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {jobInfo?.id ? (
          <Link
            href={`/jobs/${jobInfo.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/40 hover:bg-[#1E3A5F]/80 text-blue-300 hover:text-white rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job Analysis
          </Link>
        ) : (
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/40 hover:bg-[#1E3A5F]/80 text-blue-300 hover:text-white rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        )}

        <Link
          href={`/interview/new${jobInfo?.id ? `?job_id=${jobInfo.id}` : ""}`}
          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Practice Again
        </Link>
      </div>

      {/* Hero Summary */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-12">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        
        <div className="shrink-0 relative z-10 w-32 h-32 md:w-40 md:h-40">
          <FitScoreArc score={overallScore} />
        </div>

        <div className="flex-1 space-y-4 relative z-10 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Interview Summary
          </h1>
          <p className="text-gray-400 max-w-lg">
            {overallScore >= 80 
              ? "Exceptional performance! You demonstrated clear expertise and strong communication skills. You are well prepared for this role."
              : overallScore >= 60 
                ? "Solid effort. You handled several questions well, but there are a few areas you can review to make your answers fully airtight."
                : "You had some struggles in this session. Don't worry—use the feedback below to refine your stories and try again."}
          </p>

          {/* Weak Areas Alerts */}
          {weakAreas.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1 block">Areas for Improvement</span>
              {weakAreas.map((area) => (
                <div key={area} className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-200 text-sm px-3 py-2 rounded-md w-fit">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  You struggled with <strong className="capitalize">{area}</strong> questions (Avg &lt; 60)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Questions Breakdown */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3" style={{ fontFamily: "var(--font-heading)" }}>
          <Briefcase className="w-6 h-6 text-blue-400" />
          Detailed Breakdown
        </h2>

        {questions.map((q, idx) => (
          <div key={q.id || idx} className="bg-[#0A0F1C] border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  q.type === 'behavioral' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  q.type === 'technical' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {q.type}
                </span>
                <h3 className="text-lg font-medium text-white leading-snug">
                  {idx + 1}. {q.question_text}
                </h3>
              </div>
              {q.score !== undefined && q.score !== null && (
                <div className="shrink-0 flex items-center gap-2 bg-[#111827] border border-[#1E3A5F] rounded-lg px-4 py-2">
                  <span className="text-xs text-gray-500 font-medium uppercase mt-0.5">Score</span>
                  <span className={`text-xl font-bold ${
                    q.score >= 70 ? 'text-green-400' : q.score >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>{q.score}</span>
                </div>
              )}
            </div>

            {/* User Answer block */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 relative">
              <div className="absolute top-0 right-0 px-3 py-1 bg-gray-800 rounded-bl-lg rounded-tr-xl text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Your Answer
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed mt-1">
                {q.user_answer || <span className="text-gray-600 italic">No answer provided.</span>}
              </p>
            </div>

            {/* AI Feedback block */}
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 relative">
              <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500/20 rounded-bl-lg rounded-tr-xl text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                Interviewer Feedback
              </div>
              <div className="text-blue-100/80 text-sm whitespace-pre-wrap leading-relaxed mt-1 prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2">
                {q.feedback || <span className="text-blue-500/50 italic">No feedback recorded.</span>}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
