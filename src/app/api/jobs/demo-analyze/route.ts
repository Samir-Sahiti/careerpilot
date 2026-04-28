import { createAdminClient } from "@/lib/supabase/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { NextRequest } from "next/server";
import { createHash } from "crypto";

export const maxDuration = 30;

const requestSchema = z.object({
  jobRawText: z.string().min(50, "Paste at least 50 characters of the job listing").max(8000),
});

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON body", 400); }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0]?.message ?? "Invalid input", 400);

    const { jobRawText } = parsed.data;
    const ip = getIp(req);
    const ipHash = createHash("sha256").update(ip).digest("hex");

    // Rate limit: 1 per IP per 24 hours
    const supabase = createAdminClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from("demo_rate_limits")
      .select("id")
      .eq("ip_hash", ipHash)
      .gte("created_at", oneDayAgo)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return errorResponse(
        "You've used the demo today. Sign up for free to analyse your own CV against any role.",
        429
      );
    }

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: z.object({
        role_title: z.string(),
        seniority_level: z.enum(["Junior", "Mid", "Senior", "Lead", "Principal"]),
        role_family: z.string(),
        top_required_skills: z.array(z.string()),
        nice_to_have_skills: z.array(z.string()),
        key_responsibilities: z.array(z.string()),
        what_makes_a_strong_candidate: z.string(),
        red_flags_to_watch: z.array(z.string()),
      }),
      prompt: `Parse this job listing and extract structured insights a job seeker would find useful.

JOB LISTING:
${jobRawText}

Extract:
- role_title: canonical job title
- seniority_level: inferred level
- role_family: e.g. "Software Engineering", "Product Management", "Design"
- top_required_skills: the 4-6 skills that are hard requirements
- nice_to_have_skills: preferred but not required
- key_responsibilities: 3-4 core things this role actually does day-to-day
- what_makes_a_strong_candidate: 1-2 sentences on what separates a 90th-percentile applicant
- red_flags_to_watch: 1-3 things in the listing that might indicate role is worse than it sounds (vague scope, "wear many hats" without clarity, etc). Empty array if listing is clean.`,
    });

    // Record rate limit after successful AI call
    await supabase.from("demo_rate_limits").insert({ ip_hash: ipHash });

    return successResponse({ analysis: object });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Demo analyze error", { route: "/api/jobs/demo-analyze" }, error);
    return errorResponse(message, 500);
  }
}
