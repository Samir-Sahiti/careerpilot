import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ParsedCvData } from "@/types";
import { generateCoverLetterSchema } from "@/lib/validation/schemas";
import { buildCoverLetterPrompt, COVER_LETTER_SYSTEM_PROMPT } from "@/lib/ai/prompts";
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

    const parsed = generateCoverLetterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "jobTitle is required", 400);
    }

    const { jobTitle, company, jobRawText, jobAnalysisId } = parsed.data;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: cvData } = await supabase
      .from("cvs")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!cvData?.parsed_data) {
      return errorResponse("No parsed CV found. Please upload and process a CV first.", 400);
    }

    const cv = cvData.parsed_data as ParsedCvData;

    // Enrich from job analysis if job text not provided directly
    let resolvedJobRaw = jobRawText || "";
    if (jobAnalysisId && !jobRawText) {
      const { data: analysis } = await supabase
        .from("job_analyses")
        .select("job_raw_text")
        .eq("id", jobAnalysisId)
        .eq("user_id", user.id)
        .single();
      if (analysis) resolvedJobRaw = analysis.job_raw_text;
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/cover-letter/generate");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: COVER_LETTER_SYSTEM_PROMPT,
      prompt: buildCoverLetterPrompt(cv, jobTitle, company, resolvedJobRaw),
    });

    const content = text.trim();

    const { data: letter, error: insertError } = await supabase
      .from("cover_letters")
      .insert({
        user_id: user.id,
        job_analysis_id: jobAnalysisId || null,
        job_title: jobTitle,
        company: company || null,
        content,
      })
      .select("*")
      .single();

    if (insertError || !letter) {
      logger.error("Failed to save cover letter", { route: "/api/cover-letter/generate", jobTitle }, insertError);
      return errorResponse("Failed to save cover letter", 500);
    }

    await consumeRateLimit(supabase, user.id, "/api/cover-letter/generate");

    return successResponse({ id: letter.id, content: letter.content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Cover letter generation error", { route: "/api/cover-letter/generate" }, error);
    return errorResponse(message, 500);
  }
}
