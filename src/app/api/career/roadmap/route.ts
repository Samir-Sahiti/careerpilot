import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { ParsedCvData } from "@/types";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";
import { generateRoadmapSchema } from "@/lib/validation/schemas";
import { CAREER_ROADMAP_SYSTEM_PROMPT, buildCareerRoadmapPrompt } from "@/lib/ai/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let force = false;
    try {
      const body = await req.json();
      const parsed = generateRoadmapSchema.safeParse(body);
      if (parsed.success) force = parsed.data.force ?? false;
    } catch {
      // default force=false if body is missing or malformed
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData || !cvData.parsed_data) {
      return errorResponse("No active parsed CV exists. Please analyse a CV first.", 400);
    }

    const { uploaded_at, parsed_data } = cvData;

    if (!force) {
      const { data: latestRoadmap } = await supabase
        .from("career_roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRoadmap && new Date(latestRoadmap.created_at) > new Date(uploaded_at)) {
        return successResponse({ roadmap: latestRoadmap, cached: true });
      }
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/career/roadmap");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    const cv = parsed_data as ParsedCvData;

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      system: CAREER_ROADMAP_SYSTEM_PROMPT,
      prompt: buildCareerRoadmapPrompt(cv),
      schema: z.object({
        current_role: z.string(),
        paths: z.array(
          z.object({
            path_title: z.string().describe('e.g. "IC Track", "Management Track"'),
            next_role: z.string().describe('e.g. "Senior Frontend Developer"'),
            timeline_estimate: z.string().describe('e.g. "12–18 months"'),
            missing_skills: z
              .array(z.string())
              .describe(
                'Specific skills needed formatted as "Skill Name: Why it matters for this role"'
              ),
            recommended_projects: z
              .array(z.string())
              .describe("Concrete, actionable portfolio projects to build missing skills"),
            experience_needed: z
              .string()
              .describe("Plaintext description of the type of experience they must gain first"),
          })
        ),
      }),
    });

    const { data: insertedRoadmap, error: insertError } = await supabase
      .from("career_roadmaps")
      .insert({
        user_id: user.id,
        current_role: object.current_role,
        paths: object.paths,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    await consumeRateLimit(supabase, user.id, "/api/career/roadmap");

    return successResponse({ roadmap: insertedRoadmap, cached: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate roadmap";
    logger.error("Roadmap generation error", { route: "/api/career/roadmap" }, error);
    return errorResponse(message, 500);
  }
}
