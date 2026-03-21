import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { Mic, ArrowRight, Briefcase, Building2, Calendar, HelpCircle, Target } from "lucide-react";

export default async function InterviewHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all sessions ordered by newest first
  const { data: sessions, error } = await supabase
    .from("interview_sessions")
    .select("*, job_analyses(job_title, company)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch interviews", error);
  }

  // ── Empty State ────────────────────────────────────────────────────────────
  if (!sessions || sessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
        <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Mock Interviews
        </h1>
        <div className="bg-[#111827] border border-[#1E3A5F] rounded-2xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
          
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Mic className="w-8 h-8 text-blue-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">No interviews yet</h2>
            <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
              Practise your interviewing skills using our AI hiring manager tailored specifically to your CV and target role.
            </p>
          </div>

          <div className="pt-4 relative z-10">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
            >
              Analyse a job listing first
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── History List ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Mock Interviews
          </h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-2xl">
            Review your past mock interviews, feedback, and performance over time.
          </p>
        </div>
        <Link
          href="/interview/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20 text-sm shrink-0"
        >
          <Mic className="w-4 h-4" />
          Start New Interview
        </Link>
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => {
          const questions = Array.isArray(session.questions) ? session.questions : [];
          // The typing on job_analyses needs to handle array vs single object returned by supabase join
          const jobInfo = Array.isArray(session.job_analyses) 
            ? session.job_analyses[0] 
            : session.job_analyses;
            
          const jobTitle = jobInfo?.job_title || "Mock Interview";
          const company = jobInfo?.company;
          const score = session.overall_score;

          return (
            <Link
              key={session.id}
              href={`/interview/${session.id}/results`}
              className="group bg-[#0A0F1C] border border-[#1E3A5F] hover:border-blue-500/50 rounded-xl p-6 transition-all duration-300 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10 space-y-3 flex-1">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-500 shrink-0" />
                    {jobTitle}
                  </h3>
                  {company && (
                    <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {company}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                  <span className="flex items-center gap-1.5 bg-[#111827] px-2.5 py-1 rounded-md border border-gray-800">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(session.created_at), "MMM d, yyyy")}
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#111827] px-2.5 py-1 rounded-md border border-gray-800">
                    <HelpCircle className="w-3.5 h-3.5" />
                    {questions.length} Questions
                  </span>
                </div>
              </div>

              <div className="relative z-10 shrink-0 flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 border-t border-[#1E3A5F] sm:border-t-0 pt-4 sm:pt-0">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Overall Score
                  </span>
                  {score !== null && score !== undefined ? (
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-bold border ${
                      score >= 70 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                      score >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {score}/100
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-800 text-gray-400 rounded-lg text-sm font-medium border border-gray-700">
                      Unfinished
                    </span>
                  )}
                </div>
                
                <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/40 flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
