"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompletion } from "@ai-sdk/react";
import { toast } from "sonner";
import { 
  Building2, 
  MessageSquare, 
  SendHorizontal, 
  ArrowRight,
  Loader2,
  CheckCircle2
} from "lucide-react";

interface InterviewQuestion {
  id: string;
  question_text: string;
  type: "behavioral" | "technical" | "role-specific";
  guidance: string;
  user_answer?: string;
  feedback?: string;
  score?: number;
}

interface ActiveSessionProps {
  sessionId: string;
  questions: InterviewQuestion[];
  jobTitle: string;
  company?: string;
}

export function ActiveSession({ sessionId, questions: initialQs, jobTitle, company }: ActiveSessionProps) {
  const router = useRouter();
  
  // Create a copy of the questions locally so we can augment them with answers/feedback
  const [questions, setQuestions] = useState<InterviewQuestion[]>(initialQs);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // The user's active typed answer for the current question
  const [currentAnswer, setCurrentAnswer] = useState(questions[0]?.user_answer || "");
  const [isSaving, setIsSaving] = useState(false);

  // Auto-scroll ref for streaming feedback
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  const currentQ = questions[currentIndex];
  // Determine if this question has been answered and received feedback already 
  const isQuestionAnswered = !!currentQ.feedback;

  // ── AI Stream ─────────────────────────────────────────────────────────────
  const { completion, input, setInput, handleInputChange, handleSubmit, isLoading } = useCompletion({
    api: "/api/interview/feedback",
    body: {
      question: currentQ?.question_text,
      type: currentQ?.type,
      jobTitle,
      company
    },
    onFinish: async (prompt: string, aiResponse: string) => {
      // Stream is fully done. Let's extract numeric score if it exists like [SCORE: 75]
      let score: number | undefined;
      let cleanFeedback = aiResponse;
      
      const scoreMatch = aiResponse.match(/\[SCORE:\s*(\d+)\]/i);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
        // Remove the score tag from the final visible text
        cleanFeedback = aiResponse.replace(scoreMatch[0], "").trim();
      }

      // 1. Update local state copy so UI shows the final pinned version
      const qsClone = [...questions];
      qsClone[currentIndex] = {
        ...qsClone[currentIndex],
        user_answer: currentAnswer, // store their text
        feedback: cleanFeedback,
        score,
      };
      setQuestions(qsClone);

      // 2. Persist to DB directly into the JSONB array via PATCH endpoint
      setIsSaving(true);
      try {
        const patchRes = await fetch(`/api/interview/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIndex: currentIndex,
            answer: currentAnswer,
            feedback: cleanFeedback,
            score,
          }),
        });
        if (!patchRes.ok) throw new Error("Failed to save answer");
      } catch (err) {
        console.error(err);
        toast.error("Answer saved locally but failed to sync to database.");
      } finally {
        setIsSaving(false);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate feedback.");
    }
  });

  // Sync the `input` managed by useCompletion with our `currentAnswer` visually
  useEffect(() => {
    // If the streaming hook handles input, sync it internally
    setCurrentAnswer(input);
  }, [input]);

  // When changing questions, reset the input to any previously saved answer or blank
  useEffect(() => {
    const q = questions[currentIndex];
    setCurrentAnswer(q.user_answer || "");
    setInput(q.user_answer || "");
  }, [currentIndex, questions, setInput]);

  // Auto scroll feedback while streaming
  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [completion]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const onSeeResults = async () => {
    setIsSaving(true);
    const answeredQs = questions.filter(q => q.score !== undefined);
    
    if (answeredQs.length > 0) {
      const sum = answeredQs.reduce((acc, q) => acc + (q.score || 0), 0);
      const avg = Math.round(sum / answeredQs.length);
      
      try {
        await fetch(`/api/interview/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overall_score: avg }),
        });
      } catch (err) {
        console.error("Failed to save overall score", err);
      }
    }
    
    router.push(`/interview/${sessionId}/results`);
  };

  const onSubmitAnswerWrapper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnswer.trim() || isQuestionAnswered) return;
    
    // Trigger the actual Vercel AI useCompletion POST request
    handleSubmit(e);
  };

  if (!currentQ) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4 pb-4 border-b border-[#1E3A5F]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
            {jobTitle}
          </h1>
          {company && (
            <span className="flex items-center gap-1.5 text-gray-400 text-sm mt-1">
              <Building2 className="w-4 h-4" /> {company}
            </span>
          )}
        </div>
        
        {/* Progress Tracker */}
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

      {/* ── Main Question Area ──────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1E3A5F] rounded-2xl p-6 sm:p-8 space-y-8 relative overflow-hidden">
        
        {/* Type Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${
            currentQ.type === 'behavioral' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
            currentQ.type === 'technical' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {currentQ.type} Question
          </span>
        </div>

        {/* The Question Text */}
        <p className="text-xl sm:text-2xl font-medium text-white leading-relaxed">
          "{currentQ.question_text}"
        </p>

        {/* User Answer Form */}
        <form onSubmit={onSubmitAnswerWrapper} className="space-y-4 pt-4 border-t border-[#1E3A5F]/50">
          <label className="block text-sm font-medium text-gray-300">
            Your Answer
          </label>
          <textarea
            value={currentAnswer}
            onChange={handleInputChange} // bound directly to useCompletion
            disabled={isLoading || isQuestionAnswered || isSaving}
            placeholder="Type your answer here exactly as you would speak it..."
            className="w-full h-40 bg-[#0A0F1C] border border-[#1E3A5F] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none disabled:opacity-60 transition-colors"
          />

          {!isQuestionAnswered && !isLoading && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!currentAnswer.trim() || isSaving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
              >
                Submit Answer
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>

        {/* ── Feedback Stream / Result Area ─────────────────────────────── */}
        {(isLoading || completion || currentQ.feedback) && (
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-6 mt-6 animate-fade-in-up">
            <h3 className="flex items-center gap-2 text-blue-400 font-semibold mb-3">
              <MessageSquare className="w-5 h-5" />
              AI Interviewer Feedback
            </h3>
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {/* Either show final saved feedback, or the live streaming text */}
              {currentQ.feedback || completion}
              
              {isLoading && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse translate-y-0.5" />
              )}
            </div>
            
            {/* Show badge if the backend assigned a score */}
            {currentQ.score !== undefined && (
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded border border-green-500/20">
                <CheckCircle2 className="w-4 h-4" />
                Score: {currentQ.score}/100
              </div>
            )}
            
            <div ref={feedbackEndRef} />
          </div>
        )}

      </div>

      {/* ── Navigation Actions (Next / Results) ─────────────────────────── */}
      {isQuestionAnswered && !isLoading && !isSaving && (
        <div className="flex justify-end mt-8 animate-fade-in-up">
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={onNextQuestion}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700"
            >
              Next Question
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSeeResults}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
            >
              Finish & See Overall Results
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
