import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActiveSession } from "@/components/interview/ActiveSession";
import { ChatSession } from "@/components/interview/ChatSession";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InterviewSessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const sessionId = resolvedParams.id;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the session securely
  const { data: sessionData, error } = await supabase
    .from("interview_sessions")
    .select("*, job_analyses(job_title, company)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !sessionData) {
    notFound();
  }

  // Double check that we have an array of questions
  const questions = Array.isArray(sessionData.questions) 
    ? sessionData.questions 
    : [];

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-center text-gray-400">
        <p>This interview session has no questions generated yet.</p>
      </div>
    );
  }

  const isAdaptive = (sessionData as { mode?: string }).mode === "adaptive";

  return (
    <div className="max-w-4xl mx-auto py-8">
      {isAdaptive ? (
        <ChatSession
          sessionId={sessionData.id}
          initialQuestions={questions}
          jobTitle={sessionData.job_analyses?.job_title || "Mock Interview"}
          company={sessionData.job_analyses?.company || ""}
        />
      ) : (
        <ActiveSession
          sessionId={sessionData.id}
          questions={questions}
          jobTitle={sessionData.job_analyses?.job_title || "Mock Interview"}
          company={sessionData.job_analyses?.company || ""}
        />
      )}
    </div>
  );
}
