import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateFollowUpSchema } from "@/lib/validation/schemas";
import { buildFollowUpEmailPrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";
import { ParsedCvData } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400); }

    const parsed = generateFollowUpSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 400);

    const { applicationId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    // Fetch the application
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .single();

    if (appError || !app) return errorResponse("Application not found", 404);

    // Fetch active CV for the candidate's role
    const { data: cvData } = await supabase
      .from("cvs")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const cvRole = (cvData?.parsed_data as ParsedCvData | null)?.current_role ?? "professional";

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/applications/follow-up");
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.message!);

    const prompt = buildFollowUpEmailPrompt(
      app.job_title,
      app.company,
      app.applied_at ?? app.created_at,
      cvRole
    );

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      prompt,
    });

    await consumeRateLimit(supabase, user.id, "/api/applications/follow-up");

    // Persist the draft to the application row
    const { data: updated, error: updateError } = await supabase
      .from("applications")
      .update({ follow_up_draft: text.trim() })
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) logger.error("Failed to save follow-up draft", { applicationId }, updateError);

    return successResponse({ draft: text.trim(), application: updated });
  } catch (error: unknown) {
    logger.error("Follow-up generation error", { route: "/api/applications/follow-up" }, error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(req: Request) {
  // Mark follow-up as sent
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400); }

    const parsed = generateFollowUpSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 400);

    const { applicationId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { data: updated, error } = await supabase
      .from("applications")
      .update({ follow_up_sent_at: new Date().toISOString() })
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return errorResponse("Failed to mark follow-up as sent", 500);

    return successResponse(updated);
  } catch (error: unknown) {
    logger.error("Follow-up mark sent error", {}, error);
    return errorResponse("Internal server error", 500);
  }
}
