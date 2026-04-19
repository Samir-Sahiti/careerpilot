import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ParsedCvData } from "@/types";
import { interviewNextTurnSchema, InterviewNextTurnOutputSchema } from "@/lib/validation/schemas";
import { buildInterviewNextTurnPrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";

export const maxDuration = 60;

const MAX_PARENT_QUESTIONS = 9;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400); }

    const parsed = interviewNextTurnSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 400);

    const { sessionId, questionId, answer, parentQuestionCount } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    // Fetch the session + the question being answered
    const { data: sessionData, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("*, job_analyses(job_title, company)")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !sessionData) return errorResponse("Session not found", 404);

    // Find the question in the JSONB array
    const questions: Array<{
      id: string;
      question_text: string;
      type: string;
      is_follow_up?: boolean;
    }> = sessionData.questions ?? [];

    const question = questions.find((q) => q.id === questionId);
    if (!question) return errorResponse("Question not found in session", 404);

    // Fetch CV for context
    const { data: cvData } = await supabase
      .from("cvs")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!cvData?.parsed_data) return errorResponse("No active CV found", 400);

    const cv = cvData.parsed_data as ParsedCvData;
    const jobTitle = (sessionData.job_analyses as { job_title: string } | null)?.job_title ?? "the role";
    const company = (sessionData.job_analyses as { company?: string } | null)?.company ?? undefined;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/interview/next-turn");
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.message!);

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: InterviewNextTurnOutputSchema,
      prompt: buildInterviewNextTurnPrompt(
        cv,
        jobTitle,
        company,
        parentQuestionCount,
        MAX_PARENT_QUESTIONS,
        question.question_text,
        answer,
        question.type
      ),
    });

    await consumeRateLimit(supabase, user.id, "/api/interview/next-turn");

    // If action is next_question or follow_up, append the new question to the session
    if (object.action !== "end") {
      const newQuestion = {
        id: crypto.randomUUID(),
        question_text: object.text,
        type: object.question_type ?? question.type,
        guidance: "",
        is_follow_up: object.action === "follow_up",
        parent_id: object.action === "follow_up" ? questionId : null,
        user_answer: null,
        score: null,
        feedback: null,
      };

      const updatedQuestions = [...questions, newQuestion];
      await supabase
        .from("interview_sessions")
        .update({ questions: updatedQuestions })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      return successResponse({ ...object, next_question_id: newQuestion.id });
    }

    return successResponse(object);
  } catch (error: unknown) {
    logger.error("Interview next-turn error", { route: "/api/interview/next-turn" }, error);
    return errorResponse("Internal server error", 500);
  }
}
