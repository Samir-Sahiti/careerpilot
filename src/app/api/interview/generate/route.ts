import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { Cv, ParsedCvData } from "@/types";
import { generateInterviewSchema } from "@/lib/validation/schemas";
import { buildInterviewGenerationPrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = generateInterviewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Missing required field: jobTitle", 400);
    }

    const { jobTitle, companyName, jobAnalysisId, mode } = parsed.data;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData) {
      return errorResponse("Please upload an active CV before starting an interview.", 400);
    }

    const cv = cvData as Cv;
    if (!cv.parsed_data) {
      return errorResponse(
        "CV has not been parsed yet. Please wait for processing to complete.",
        400
      );
    }

    const parsedCv = cv.parsed_data as ParsedCvData;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/interview/generate");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    const { object: result } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: z.object({
        questions: z.array(
          z.object({
            id: z.string().describe("A unique slug or identifier string for the question"),
            question_text: z.string(),
            type: z.enum(["behavioral", "technical", "role-specific"]),
            guidance: z.string(),
          })
        ),
      }),
      prompt: buildInterviewGenerationPrompt(parsedCv, jobTitle, companyName),
    });

    const cleanQuestions = result.questions.filter((q) => q.question_text?.trim().length > 0);

    if (cleanQuestions.length === 0) {
      throw new Error("Failed to generate valid interview questions.");
    }

    // Adaptive mode: start with only the first question; subsequent questions are generated turn-by-turn
    const sessionQuestions = mode === "adaptive" ? [cleanQuestions[0]] : cleanQuestions;

    const { data: sessionData, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        job_analysis_id: jobAnalysisId || null,
        questions: sessionQuestions,
        mode: mode ?? "standard",
      })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      logger.error("Failed to insert interview session", { route: "/api/interview/generate", jobTitle }, sessionError);
      return errorResponse("Failed to save interview session", 500);
    }

    await consumeRateLimit(supabase, user.id, "/api/interview/generate");

    return successResponse({ id: sessionData.id, mode: mode ?? "standard" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Interview generation error", { route: "/api/interview/generate" }, error);
    return errorResponse(message, 500);
  }
}
