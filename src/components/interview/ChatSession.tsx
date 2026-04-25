"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { toast } from "sonner";
import {
  Building2,
  SendHorizontal,
  Loader2,
  CheckCircle2,
  ThumbsUp,
  ArrowUpCircle,
  MessageSquare,
  CornerDownRight,
  Flag,
} from "lucide-react";
import { InterviewFeedbackOutputSchema } from "@/lib/validation/schemas";

interface ChatQuestion {
  id: string;
  question_text: string;
  type: "behavioral" | "technical" | "role-specific";
  guidance: string;
  is_follow_up?: boolean;
  parent_id?: string | null;
  user_answer?: string | null;
  score?: number | null;
  feedback?: string | null;
  strengths?: string[];
  improvements?: string[];
  star_coverage?: { situation: boolean; task: boolean; action: boolean; result: boolean };
}

interface Props {
  sessionId: string;
  initialQuestions: ChatQuestion[];
  jobTitle: string;
  company?: string;
}

const MAX_PARENT_QUESTIONS = 9;

export function ChatSession({ sessionId, initialQuestions, jobTitle, company }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<ChatQuestion[]>(initialQuestions);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [gettingNext, setGettingNext] = useState(false);
  const [done, setDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const currentQ = questions[currentIdx];
  const parentCount = questions.filter((q) => !q.is_follow_up).length;
  const isAnswered = !!currentQ?.feedback;

  const { object: streamObj, submit, isLoading } = useObject({
    api: "/api/interview/feedback",
    schema: InterviewFeedbackOutputSchema,
    onFinish: async ({ object: result }: { object: typeof InterviewFeedbackOutputSchema._type | undefined }) => {
      if (!result) return;

      const updated: ChatQuestion = {
        ...currentQ,
        user_answer: answer,
        feedback: result.feedback,
        score: result.score,
        strengths: result.strengths,
        improvements: result.improvements,
        star_coverage: result.star_coverage,
      };

      setQuestions((prev) => prev.map((q, i) => (i === currentIdx ? updated : q)));

      // Persist answer + feedback
      setIsSaving(true);
      try {
        await fetch(`/api/interview/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIndex: currentIdx,
            answer,
            feedback: result.feedback,
            score: result.score,
            star_coverage: result.star_coverage,
          }),
        });
      } catch {
        toast.error("Failed to sync answer.");
      } finally {
        setIsSaving(false);
      }
    },
    onError: () => toast.error("Failed to generate feedback."),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamObj, currentIdx, gettingNext]);

  const submitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isAnswered) return;
    submit({ prompt: answer, question: currentQ.question_text, type: currentQ.type, jobTitle, company });
  };

  const getNextTurn = async () => {
    if (gettingNext) return;
    setGettingNext(true);
    try {
      const res = await fetch("/api/interview/next-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.id,
          answer: currentQ.user_answer ?? answer,
          parentQuestionCount: parentCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get next question");

      if (data.action === "end") {
        setDone(true);
      } else {
        // The API has appended the new question to the session — refresh questions from DB
        const sessionRes = await fetch(`/api/interview/${sessionId}`);
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.questions) {
            setQuestions(sessionData.questions);
            setCurrentIdx(sessionData.questions.length - 1);
            setAnswer("");
          }
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to advance session");
    } finally {
      setGettingNext(false);
    }
  };

  const finishSession = async () => {
    setIsSaving(true);
    const answered = questions.filter((q) => q.score !== undefined && q.score !== null);
    if (answered.length > 0) {
      const avg = Math.round(answered.reduce((s, q) => s + (q.score ?? 0), 0) / answered.length);
      try {
        await fetch(`/api/interview/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overall_score: avg }),
        });
      } catch { /* non-critical */ }
    }
    router.push(`/interview/${sessionId}/results`);
  };

  const displayFeedback = isAnswered
    ? { feedback: currentQ.feedback, strengths: currentQ.strengths, improvements: currentQ.improvements, score: currentQ.score, star_coverage: currentQ.star_coverage }
    : streamObj;

  if (!currentQ) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4 pb-4 border-b border-[#2d2a26]">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {jobTitle} — Adaptive Interview
          </h1>
          {company && (
            <span className="flex items-center gap-1.5 text-gray-400 text-sm mt-1">
              <Building2 className="w-4 h-4" /> {company}
            </span>
          )}
        </div>
        <span className="text-sm font-medium text-gray-400 uppercase tracking-wider shrink-0">
          {parentCount} / {MAX_PARENT_QUESTIONS} questions
        </span>
      </div>

      {/* Question history (answered) */}
      <div className="space-y-4">
        {questions.slice(0, currentIdx).map((q) => (
          <div
            key={q.id}
            className={`rounded-xl border p-4 space-y-2 ${
              q.is_follow_up
                ? "ml-6 border-purple-500/20 bg-purple-500/5"
                : "border-[#2d2a26] bg-[#1a1916]/60"
            }`}
          >
            <div className="flex items-start gap-2">
              {q.is_follow_up && <CornerDownRight className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />}
              <div className="space-y-1 min-w-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide border ${
                  q.type === "behavioral" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                  q.type === "technical" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {q.is_follow_up ? "Follow-up" : q.type}
                </span>
                <p className="text-sm text-gray-300 font-medium">&ldquo;{q.question_text}&rdquo;</p>
                {q.user_answer && (
                  <p className="text-xs text-gray-500 italic truncate">You: {q.user_answer}</p>
                )}
              </div>
              {q.score !== null && q.score !== undefined && (
                <span className="ml-auto shrink-0 text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                  {q.score}/100
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current question */}
      {!done && (
        <div className={`bg-[#1a1916] rounded-2xl border p-6 sm:p-8 space-y-6 ${
          currentQ.is_follow_up ? "border-purple-500/30" : "border-[#2d2a26]"
        }`}>
          {currentQ.is_follow_up && (
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold">
              <CornerDownRight className="w-3.5 h-3.5" />
              Follow-up question
            </div>
          )}
          <div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${
              currentQ.type === "behavioral" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
              currentQ.type === "technical" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
              "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              {currentQ.type} Question
            </span>
          </div>

          <p className="text-xl sm:text-2xl font-medium text-white leading-relaxed">
            &ldquo;{currentQ.question_text}&rdquo;
          </p>

          <form onSubmit={submitAnswer} className="space-y-4 pt-4 border-t border-[#2d2a26]/50">
            <label className="block text-sm font-medium text-gray-300">Your Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isLoading || isAnswered || isSaving}
              placeholder="Type your answer exactly as you would say it…"
              className="w-full h-40 bg-[#0f0e0c] border border-[#2d2a26] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 resize-none disabled:opacity-60 transition-colors"
            />
            {!isAnswered && !isLoading && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!answer.trim() || isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-medium rounded-lg transition-colors text-sm"
                >
                  Submit Answer <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}
          </form>

          {/* Feedback */}
          {(isLoading || displayFeedback) && (
            <div className="bg-blue-900/10 border border-amber-500/20 rounded-xl p-6 space-y-5 animate-fade-in-up">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <MessageSquare className="w-5 h-5" />
                AI Feedback
                {isLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
              </div>

              {displayFeedback?.feedback && (
                <p className="text-sm text-gray-300 leading-relaxed">{displayFeedback.feedback}</p>
              )}

              {displayFeedback?.strengths && displayFeedback.strengths.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                  </p>
                  <ul className="space-y-1.5">
                    {displayFeedback.strengths.filter((s): s is string => !!s).map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {displayFeedback?.improvements && displayFeedback.improvements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Improvements
                  </p>
                  <ul className="space-y-1.5">
                    {displayFeedback.improvements.filter((s): s is string => !!s).map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-300">
                        <span className="w-4 h-4 shrink-0 mt-0.5 text-amber-500 font-bold text-xs flex items-center justify-center">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {displayFeedback?.star_coverage && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">STAR Coverage</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["situation", "task", "action", "result"] as const).map((key) => (
                      <div key={key} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        displayFeedback.star_coverage?.[key]
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {displayFeedback?.score !== undefined && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded border border-green-500/20">
                  <CheckCircle2 className="w-4 h-4" /> Score: {displayFeedback.score}/100
                </div>
              )}
            </div>
          )}

          {/* Next action */}
          {isAnswered && !isLoading && !isSaving && (
            <div className="flex justify-end gap-3 mt-4 animate-fade-in-up">
              <button
                onClick={finishSession}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors text-sm border border-gray-700"
              >
                <Flag className="w-4 h-4" /> Finish session
              </button>
              {parentCount < MAX_PARENT_QUESTIONS && !done && (
                <button
                  onClick={getNextTurn}
                  disabled={gettingNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-900 font-medium rounded-lg transition-colors text-sm"
                >
                  {gettingNext ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {gettingNext ? "Thinking…" : "Next"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Done state */}
      {done && (
        <div className="text-center py-8 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Interview complete</h2>
            <p className="text-gray-400 text-sm mt-1">All questions answered. View your overall results below.</p>
          </div>
          <button
            onClick={finishSession}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors mx-auto"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            See Results
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
