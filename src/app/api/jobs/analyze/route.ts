import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { Cv, ParsedCvData } from "@/types";
import { analyzeJobSchema } from "@/lib/validation/schemas";
import { buildJobAnalysisPrompt } from "@/lib/ai/prompts";
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

    const parsed = analyzeJobSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Missing required fields", 400);
    }

    const { cvId, jobTitle, company, jobRawText } = parsed.data;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (cvError || !cvData) {
      return errorResponse("Active CV not found", 404);
    }

    const cv = cvData as Cv;
    if (!cv.parsed_data) {
      return errorResponse("CV has not been parsed yet.", 400);
    }

    const parsedCv = cv.parsed_data as ParsedCvData;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/jobs/analyze");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    const { object: analysis } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: z.object({
        fit_score: z.number().int(),
        recommendation: z.enum(["apply", "maybe", "skip"]),
        recommendation_reason: z.string(),
        matched_skills: z.array(z.string()),
        missing_skills: z.array(z.string()),
        cv_suggestions: z.array(z.string()),
        salary_estimate: z
          .object({
            currency: z.string(),
            low: z.number(),
            mid: z.number(),
            high: z.number(),
            factors: z.array(z.string()),
            negotiation_tip: z.string(),
          })
          .nullable()
          .optional(),
      }),
      prompt: buildJobAnalysisPrompt(parsedCv, jobTitle, company, jobRawText),
    });

    const { data: newRow, error: insertError } = await supabase
      .from("job_analyses")
      .insert({
        user_id: user.id,
        cv_id: cvId,
        job_title: jobTitle,
        company: company ?? null,
        job_raw_text: jobRawText,
        fit_score: analysis.fit_score,
        recommendation: analysis.recommendation,
        recommendation_reason: analysis.recommendation_reason,
        matched_skills: analysis.matched_skills,
        missing_skills: analysis.missing_skills,
        cv_suggestions: analysis.cv_suggestions,
        salary_estimate: analysis.salary_estimate ?? null,
      })
      .select("id")
      .single();

    if (insertError || !newRow) {
      logger.error("Failed to save analysis", { route: "/api/jobs/analyze", cvId, jobTitle }, insertError);
      return errorResponse("Failed to save analysis", 500);
    }

    await consumeRateLimit(supabase, user.id, "/api/jobs/analyze");

    return successResponse({ id: newRow.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Job analysis error", { route: "/api/jobs/analyze" }, error);
    return errorResponse(message, 500);
  }
}
