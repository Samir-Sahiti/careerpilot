import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { logger } from "@/lib/logger";

const ExtractionOutputSchema = z.object({
  required_skills: z.array(z.string()),
  preferred_skills: z.array(z.string()),
});

/**
 * Use a constrained Claude call to extract skills from a job listing,
 * choosing only from the provided canonical taxonomy names.
 * Returns { required, preferred } arrays of canonical skill names.
 *
 * This is the AI-augmented approach (option B from SG-6): Claude is already
 * in the job analysis call, so the marginal cost of this extraction is small,
 * and recall is much higher than pure string-matching against the taxonomy.
 */
export async function extractListingSkills(
  jobRawText: string,
  taxonomyNames: string[]
): Promise<{ required: string[]; preferred: string[] }> {
  if (taxonomyNames.length === 0) return { required: [], preferred: [] };

  // Cap to first 250 to keep prompt size manageable (~95% coverage in practice)
  const cap = taxonomyNames.slice(0, 250);

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: ExtractionOutputSchema,
      prompt: `You are extracting skills from a job listing for semantic matching.

CANONICAL SKILL LIST (choose ONLY from these exact names):
${cap.join(", ")}

JOB LISTING:
${jobRawText.substring(0, 8000)}

Instructions:
- required_skills: skills the listing marks as required/must-have/essential
- preferred_skills: skills the listing marks as preferred/nice-to-have/bonus/desirable
- ONLY include skills from the canonical list above — use the exact names provided
- If a skill is implied but not on the list, omit it
- Do not invent skills not present in the listing`,
    });

    return {
      required: object.required_skills,
      preferred: object.preferred_skills,
    };
  } catch (err) {
    logger.error("Listing skill extraction failed", { textLength: jobRawText.length }, err);
    return { required: [], preferred: [] };
  }
}
