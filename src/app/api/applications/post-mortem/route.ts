import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";
import { buildRejectionPostMortemPrompt } from "@/lib/ai/prompts";

export const maxDuration = 60;

const postMortemRequestSchema = z.object({
  applicationId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = postMortemRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Missing required fields", 400);
    }

    const { applicationId } = parsed.data;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Fetch application + linked job analysis
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("*, job_analyses(fit_score, matched_skills, missing_skills)")
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .single();

    if (appError || !app) {
      return errorResponse("Application not found", 404);
    }

    if (app.status !== "rejected") {
      return errorResponse("Post-mortem only available for rejected applications", 400);
    }

    if (!app.outcome_stage_reached) {
      return errorResponse("Outcome data not yet captured for this application", 400);
    }

    const jobAnalysis = Array.isArray(app.job_analyses)
      ? app.job_analyses[0]
      : app.job_analyses;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/applications/post-mortem");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    const { object: postMortem } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: z.object({
        likely_gap: z.string().min(10),
        similar_profiles_action: z.string().min(10),
        roadmap_update_suggestion: z.string().min(5),
      }),
      prompt: buildRejectionPostMortemPrompt(
        app.job_title,
        app.company ?? undefined,
        jobAnalysis?.fit_score ?? null,
        jobAnalysis?.matched_skills ?? [],
        jobAnalysis?.missing_skills ?? [],
        app.outcome_stage_reached,
        app.outcome_reason ?? undefined
      ),
    });

    await consumeRateLimit(supabase, user.id, "/api/applications/post-mortem");

    return successResponse({ postMortem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Post-mortem error", { route: "/api/applications/post-mortem" }, error);
    return errorResponse(message, 500);
  }
}
