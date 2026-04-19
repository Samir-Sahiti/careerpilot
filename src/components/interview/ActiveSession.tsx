"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { toast } from "sonner";
import {
  Building2,
  MessageSquare,
  SendHorizontal,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ThumbsUp,
  ArrowUpCircle,
} from "lucide-react";
import { InterviewFeedbackOutputSchema } from "@/lib/validation/schemas";

interface InterviewQuestion {
  id: string;
  question_text: string;
  type: "behavioral" | "technical" | "role-specific";
  guidance: string;
  user_answer?: string;
  feedback?: string;
  score?: number;
  strengths?: string[];
  improvements?: string[];
  star_coverage?: { situation: boolean; task: boolean; action: boolean; result: boolean };
}

interface ActiveSessionProps {
  sessionId: string;
  questions: InterviewQuestion[];
  jobTitle: string;
  company?: string;
}

export function ActiveSession({ sessionId, questions: initialQs, jobTitle, company }: ActiveSessionProps) {
  const router = useRouter();

  const [questions, setQuestions] = useState<InterviewQuestion[]>(initialQs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const feedbackEndRef = useRef<HTMLDivElement>(null);
  const currentQ = questions[currentIndex];
  const isAnswered = !!currentQ.feedback;

  const { object, submit, isLoading } = useObject({
    api: "/api/interview/feedback",
    schema: InterviewFeedbackOutputSchema,
    onFinish: async ({ object: result }: { object: typeof InterviewFeedbackOutputSchema._type | undefined }) => {
      if (!result) return;

      const updatedQ: InterviewQuestion = {
        ...currentQ,
        user_answer: answer,
        feedback: result.feedback,
        score: result.score,
        strengths: result.strengths,
        improvements: result.improvements,
        star_coverage: result.star_coverage,
      };

      setQuestions((prev) => prev.map((q, i) => (i === currentIndex ? updatedQ : q)));

      setIsSaving(true);
      try {
        const res = await fetch(`/api/interview/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIndex: currentIndex,
            answer,
            feedback: result.feedback,
            score: result.score,
            star_coverage: result.star_coverage,
          }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Answer saved locally but failed to sync.");
      } finally {
        setIsSaving(false);
      }
    },
    onError: () => toast.error("Failed to generate feedback."),
  });

  useEffect(() => {
    const q = questions[currentIndex];
    setAnswer(q.user_answer || "");
  }, [currentIndex, questions]);

  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [object]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isAnswered) return;
    submit({
      prompt: answer,
      question: currentQ.question_text,
      type: currentQ.type,
      jobTitle,
      company,
    });
  };

  const onSkip = async () => {
    if (isSaving || isAnswered) return;
    setIsSaving(true);
    const skippedQ: InterviewQuestion = {
      ...currentQ,
      user_answer: "Skipped",
      feedback: "Question skipped.",
      score: 0,
    };
    setQuestions((prev) => prev.map((q, i) => (i === currentIndex ? skippedQ : q)));
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: currentIndex, answer: "Skipped", feedback: "Question skipped.", score: 0 }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to sync skip.");
    } finally {
      setIsSaving(false);
    }
  };

  const onSeeResults = async () => {
    setIsSaving(true);
    const answered = questions.filter((q) => q.score !== undefined);
    if (answered.length > 0) {
      const avg = Math.round(answered.reduce((s, q) => s + (q.score ?? 0), 0) / answered.length);
      try {
        await fetch(`/api/interview/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overall_score: avg }),
        });
      } catch {
        console.error("Failed to save overall score");
      }
    }
    router.push(`/interview/${sessionId}/results`);
  };

  // When saved, use the stored question fields. When streaming, use the partial object.
  const displayFeedback = isAnswered
    ? {
        feedback: currentQ.feedback,
        strengths: currentQ.strengths,
        improvements: currentQ.improvements,
        score: currentQ.score,
        star_coverage: currentQ.star_coverage,
      }
    : object;

  if (!currentQ) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4 pb-4 border-b border-[#1E3A5F]">
        <div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {jobTitle}
          </h1>
          {company && (
            <span className="flex items-center gap-1.5 text-gray-400 text-sm mt-1">
              <Building2 className="w-4 h-4" /> {company}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <div className="w-24 h-2 bg-[#1E3A5F] rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 space-y-8">
        <div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${
              currentQ.type === "behavioral"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : currentQ.type === "technical"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            {currentQ.type} Question
          </span>
        </div>

        <p className="text-xl sm:text-2xl font-medium text-white leading-relaxed">
          &ldquo;{currentQ.question_text}&rdquo;
        </p>

        {/* Answer form */}
        <form onSubmit={onSubmit} className="space-y-4 pt-4 border-t border-[#1E3A5F]/50">
          <label className="block text-sm font-medium text-gray-300">Your Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={isLoading || isAnswered || isSaving}
            placeholder="Type your answer here exactly as you would speak it..."
            className="w-full h-40 bg-[#0A0F1C] border border-[#1E3A5F] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none disabled:opacity-60 transition-colors"
          />
          {!isAnswered && !isLoading && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onSkip}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium rounded-lg transition-colors text-sm border border-gray-700"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={!answer.trim() || isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Submit Answer <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

        {/* Feedback area */}
        {(isLoading || displayFeedback) && (
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2 text-blue-400 font-semibold">
              <MessageSquare className="w-5 h-5" />
              AI Interviewer Feedback
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
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {s}
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
                      <span className="w-4 h-4 shrink-0 mt-0.5 text-amber-500 font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* STAR coverage — behavioral only */}
            {displayFeedback?.star_coverage && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">STAR Coverage</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["situation", "task", "action", "result"] as const).map((key) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                        displayFeedback.star_coverage?.[key]
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayFeedback?.score !== undefined && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded border border-green-500/20">
                <CheckCircle2 className="w-4 h-4" />
                Score: {displayFeedback.score}/100
              </div>
            )}

            <div ref={feedbackEndRef} />
          </div>
        )}
      </div>

      {/* Navigation */}
      {isAnswered && !isLoading && !isSaving && (
        <div className="flex justify-end mt-8 animate-fade-in-up">
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((p) => p + 1)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700"
            >
              Next Question <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSeeResults}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
            >
              Finish & See Overall Results <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
