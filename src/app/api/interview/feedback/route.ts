import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { streamObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ParsedCvData } from "@/types";
import { interviewFeedbackSchema, InterviewFeedbackOutputSchema } from "@/lib/validation/schemas";
import { buildInterviewFeedbackSystem } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, rateLimitResponse } from "@/lib/apiResponse";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = interviewFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Missing required fields", 400);
    }

    const { prompt, question, type, jobTitle, company } = parsed.data;

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData || !cvData.parsed_data) {
      return errorResponse("CV data not found", 400);
    }

    const parsedCv = cvData.parsed_data as ParsedCvData;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/interview/feedback");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    // Consume before streaming — can't hook post-stream cleanly in serverless
    await consumeRateLimit(supabase, user.id, "/api/interview/feedback");

    const systemMessage = buildInterviewFeedbackSystem(parsedCv, question, type, jobTitle, company);

    const result = streamObject({
      model: anthropic("claude-haiku-4-5"),
      schema: InterviewFeedbackOutputSchema,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Interview feedback stream error", { route: "/api/interview/feedback" }, error);
    return new Response(message, { status: 500 });
  }
}
