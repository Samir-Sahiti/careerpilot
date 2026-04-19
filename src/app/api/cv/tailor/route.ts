import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ParsedCvData, JobAnalysis } from "@/types";
import { tailorCvSchema, TailoredCvOutputSchema } from "@/lib/validation/schemas";
import { buildCvTailorPrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400); }

    const parsed = tailorCvSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 400);

    const { jobAnalysisId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    // Fetch job analysis
    const { data: analysisData, error: analysisError } = await supabase
      .from("job_analyses")
      .select("*")
      .eq("id", jobAnalysisId)
      .eq("user_id", user.id)
      .single();

    if (analysisError || !analysisData) return errorResponse("Job analysis not found", 404);
    const analysis = analysisData as JobAnalysis;

    // Fetch active CV
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData || !cvData.parsed_data) {
      return errorResponse("No active parsed CV found. Please upload and parse your CV first.", 400);
    }

    const cv = cvData.parsed_data as ParsedCvData;

    // Check if a tailored CV already exists for this analysis
    const { data: existing } = await supabase
      .from("tailored_cvs")
      .select("id")
      .eq("job_analysis_id", jobAnalysisId)
      .eq("user_id", user.id)
      .maybeSingle();

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/cv/tailor");
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.message!);

    const prompt = buildCvTailorPrompt(
      cv,
      analysis.job_title,
      analysis.company ?? undefined,
      analysis.job_raw_text,
      analysis.matched_skills ?? [],
      analysis.missing_skills ?? []
    );

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: TailoredCvOutputSchema,
      prompt,
    });

    await consumeRateLimit(supabase, user.id, "/api/cv/tailor");

    // Build tailored ParsedCvData (preserve original fields not in the tailored output)
    const tailoredData: ParsedCvData = {
      current_role: cv.current_role,
      seniority_level: cv.seniority_level,
      years_of_experience: cv.years_of_experience,
      skills: object.skills,
      education: object.education,
      experience: object.experience,
      achievements: cv.achievements,
    };

    let tailoredCvId: string;

    if (existing) {
      // Update existing
      const { data: updated, error: updateError } = await supabase
        .from("tailored_cvs")
        .update({
          tailored_data: tailoredData,
          user_edits: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error("Failed to update tailored CV", { jobAnalysisId }, updateError);
        return errorResponse("Failed to save tailored CV", 500);
      }
      return successResponse({ ...updated, tailoring_notes: object.tailoring_notes, summary: object.summary });
    } else {
      // Insert new
      const { data: inserted, error: insertError } = await supabase
        .from("tailored_cvs")
        .insert({
          user_id: user.id,
          cv_id: cvData.id,
          job_analysis_id: jobAnalysisId,
          tailored_data: tailoredData,
        })
        .select()
        .single();

      if (insertError) {
        logger.error("Failed to insert tailored CV", { jobAnalysisId }, insertError);
        return errorResponse("Failed to save tailored CV", 500);
      }
      tailoredCvId = inserted.id;
      return successResponse({ ...inserted, tailoring_notes: object.tailoring_notes, summary: object.summary });
    }

    // (unreachable but satisfies TS)
    void tailoredCvId;
  } catch (error: unknown) {
    logger.error("CV tailoring error", { route: "/api/cv/tailor" }, error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(req: Request) {
  // Save user edits to a tailored CV
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400); }

    const { tailoredCvId, userEdits } = body as { tailoredCvId: string; userEdits: unknown };
    if (!tailoredCvId) return errorResponse("tailoredCvId is required", 400);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { data, error } = await supabase
      .from("tailored_cvs")
      .update({ user_edits: userEdits, updated_at: new Date().toISOString() })
      .eq("id", tailoredCvId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return errorResponse("Failed to save edits", 500);
    return successResponse(data);
  } catch (error: unknown) {
    logger.error("Tailored CV PATCH error", {}, error);
    return errorResponse("Internal server error", 500);
  }
}
