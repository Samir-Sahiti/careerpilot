import { createClient } from "@/lib/supabase/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { companyContextSchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { z } from "zod";

export const maxDuration = 30;

// Server-side in-memory cache: (company_normalized, date) → result
// Cleared on server restart; good enough for hot traffic within a single deployment
const cache = new Map<string, { data: CompanyContext; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const CompanyContextOutputSchema = z.object({
  overview: z.string(),
  size: z.string(),
  funding_stage: z.string(),
  glassdoor_rating: z.number().nullable(),
  recent_notable: z.string(),
  layoff_signals: z.string(),
  disclaimer: z.string(),
});

type CompanyContext = z.infer<typeof CompanyContextOutputSchema>;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyRaw = searchParams.get("company");

    const parsed = companyContextSchema.safeParse({ company: companyRaw });
    if (!parsed.success) return errorResponse("company is required", 400);

    const { company } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const cacheKey = `${company.toLowerCase().trim()}:${new Date().toISOString().slice(0, 10)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return successResponse(cached.data);
    }

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: CompanyContextOutputSchema,
      prompt: `Provide factual context about the company "${company}" for a job seeker evaluating whether to apply there.

Return:
- overview: 1-2 sentences on what the company does, its stage/size, and market position.
- size: Approximate employee count (e.g. "~2,000 employees" or "seed stage startup, <50 employees"). Use ranges if unsure.
- funding_stage: One of: "public", "private equity", "late-stage VC (Series C+)", "mid-stage VC (Series A/B)", "seed/angel", "bootstrapped", "unknown"
- glassdoor_rating: A number 1-5 if you have reasonable confidence, otherwise null.
- recent_notable: 1 sentence on the most notable recent development (funding round, product launch, acquisition, layoffs, etc.). If nothing notable in last 12 months, say "No major recent news in training data."
- layoff_signals: 1 sentence on any known layoffs or hiring freezes. If none known, say "No known layoffs in training data."
- disclaimer: Always return exactly: "Context sourced from AI training data (cutoff: early 2025). Verify with Glassdoor, LinkedIn, and recent news before making decisions."

Be honest about uncertainty. Do not invent specific facts.`,
    });

    cache.set(cacheKey, { data: object, ts: Date.now() });

    return successResponse(object);
  } catch (error: unknown) {
    logger.error("Company context error", { route: "/api/jobs/company-context" }, error);
    return errorResponse("Failed to fetch company context", 500);
  }
}
