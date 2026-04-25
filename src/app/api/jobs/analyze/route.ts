import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { Cv, OutcomeHistoryItem, ParsedCvData, SkillGroundTruth } from "@/types";
import { analyzeJobSchema } from "@/lib/validation/schemas";
import { buildJobAnalysisPrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";
import { getTaxonomyIndex, normalizeSkills, logUnknownSkills } from "@/lib/skills";
import { extractListingSkills } from "@/lib/skills/extractFromListing";

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

    // T2-1: Build outcome history for few-shot calibration
    let userHistory: OutcomeHistoryItem[] | undefined;
    try {
      const { data: historyRows } = await supabase
        .from("applications")
        .select("outcome_fit_score_at_apply, outcome_stage_reached, outcome_reason, job_title, company")
        .eq("user_id", user.id)
        .not("outcome_stage_reached", "is", null)
        .not("outcome_fit_score_at_apply", "is", null)
        .order("outcome_captured_at", { ascending: false })
        .limit(10);

      if (historyRows && historyRows.length >= 3) {
        const rejections = historyRows.filter((r) => r.outcome_stage_reached === "no_response").slice(0, 5);
        const positives = historyRows.filter((r) => r.outcome_stage_reached !== "no_response").slice(0, 5);
        const combined = [...positives, ...rejections].slice(0, 10);
        userHistory = combined.map((r) => ({
          fit_score_at_application: r.outcome_fit_score_at_apply as number,
          outcome_stage_reached: r.outcome_stage_reached,
          outcome_reason: r.outcome_reason ?? null,
          job_title: r.job_title,
          company: r.company ?? null,
        }));
      }
    } catch {
      // non-critical — proceed without history
    }

    // SG-6: Compute deterministic skill ground truth before calling Claude
    let groundTruth: SkillGroundTruth | null = null;
    let listingSkillsForDb: { name: string; is_required: boolean; is_matched: boolean }[] = [];

    try {
      const taxonomy = await getTaxonomyIndex();
      const taxonomyNames = Array.from(taxonomy.byCanonical.values()).map((s) => s.canonical_name);

      // Step 1: Extract listing skills via constrained Claude call (SG-6 approach B)
      const { required: requiredNames, preferred: preferredNames } = await extractListingSkills(
        jobRawText,
        taxonomyNames
      );

      // Step 2: Normalize extracted listing skills to get canonical IDs
      const requiredResults = normalizeSkills(requiredNames, taxonomy);
      const preferredResults = normalizeSkills(preferredNames, taxonomy);
      const listingSkillIds = new Set([
        ...requiredResults.filter((r) => r.canonical).map((r) => r.canonical!.id),
        ...preferredResults.filter((r) => r.canonical).map((r) => r.canonical!.id),
      ]);
      const requiredIds = new Set(requiredResults.filter((r) => r.canonical).map((r) => r.canonical!.id));

      // Step 3: Get user's CV skill IDs (from cv_skills table or normalize on the fly)
      let userSkillIds = new Set<string>();
      const { data: cvSkillRows } = await supabase
        .from("cv_skills")
        .select("skill_id")
        .eq("cv_id", cvId);

      if (cvSkillRows && cvSkillRows.length > 0) {
        // Pre-normalized skills available
        userSkillIds = new Set(cvSkillRows.map((r) => r.skill_id as string));
      } else {
        // Fall back: normalize parsed_data.skills on the fly
        const cvResults = normalizeSkills(parsedCv.skills, taxonomy);
        userSkillIds = new Set(
          cvResults.filter((r) => r.canonical).map((r) => r.canonical!.id)
        );
      }

      // Step 4: Compute intersection deterministically
      const matchedIds = new Set([...listingSkillIds].filter((id) => userSkillIds.has(id)));
      const missingIds = new Set([...listingSkillIds].filter((id) => !userSkillIds.has(id)));

      // Build human-readable names for the prompt
      const idToName = new Map(
        [...requiredResults, ...preferredResults]
          .filter((r) => r.canonical)
          .map((r) => [r.canonical!.id, r.canonical!.canonical_name])
      );

      groundTruth = {
        matched: [...matchedIds].map((id) => idToName.get(id) ?? id),
        required_missing: [...missingIds]
          .filter((id) => requiredIds.has(id))
          .map((id) => idToName.get(id) ?? id),
        preferred_missing: [...missingIds]
          .filter((id) => !requiredIds.has(id))
          .map((id) => idToName.get(id) ?? id),
      };

      // Prepare data for job_analysis_skills table (SG-4)
      for (const r of requiredResults) {
        if (!r.canonical) continue;
        listingSkillsForDb.push({
          name: r.canonical.canonical_name,
          is_required: true,
          is_matched: matchedIds.has(r.canonical.id),
        });
      }
      for (const r of preferredResults) {
        if (!r.canonical) continue;
        if (listingSkillsForDb.some((s) => s.name === r.canonical!.canonical_name)) continue;
        listingSkillsForDb.push({
          name: r.canonical.canonical_name,
          is_required: false,
          is_matched: matchedIds.has(r.canonical.id),
        });
      }

      // SG-7: Log unknown listing skills
      const unknownListing = [...requiredResults, ...preferredResults].filter((r) => !r.canonical);
      if (unknownListing.length > 0) {
        await logUnknownSkills(unknownListing.map((r) => r.raw), "job_listing");
      }
    } catch (skillErr) {
      // Non-critical — fall back to Claude-only matching (no ground truth)
      logger.error("Skill ground truth computation failed (non-critical)", { cvId, jobTitle }, skillErr);
      groundTruth = null;
    }

    // Main analysis call — Claude handles qualitative reasoning, ground truth handles skills
    const { object: analysis } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: z.object({
        fit_score: z.number().int(),
        fit_score_basis: z.enum(["explicit", "inferred", "speculative"]),
        fit_score_rationale: z.string(),
        recommendation: z.enum(["apply", "maybe", "skip"]),
        recommendation_reason: z.string(),
        cv_suggestions: z.array(z.string()),
        salary_estimate: z
          .discriminatedUnion("shown_in_listing", [
            z.object({
              shown_in_listing: z.literal(true),
              currency: z.string(),
              low: z.number(),
              mid: z.number(),
              high: z.number(),
              negotiation_tip: z.string(),
            }),
            z.object({
              shown_in_listing: z.literal(false),
              guidance: z.string(),
              negotiation_tip: z.string(),
            }),
          ])
          .nullable()
          .optional(),
      }),
      prompt: buildJobAnalysisPrompt(parsedCv, jobTitle, company, jobRawText, groundTruth, userHistory),
    });

    // matched_skills/missing_skills come from ground truth when available, Claude otherwise
    const matchedSkills = groundTruth?.matched ?? [];
    const missingSkills = groundTruth
      ? [...groundTruth.required_missing, ...groundTruth.preferred_missing]
      : [];

    const { data: newRow, error: insertError } = await supabase
      .from("job_analyses")
      .insert({
        user_id: user.id,
        cv_id: cvId,
        job_title: jobTitle,
        company: company ?? null,
        job_raw_text: jobRawText,
        fit_score: analysis.fit_score,
        fit_score_basis: analysis.fit_score_basis,
        fit_score_rationale: analysis.fit_score_rationale,
        recommendation: analysis.recommendation,
        recommendation_reason: analysis.recommendation_reason,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        cv_suggestions: analysis.cv_suggestions,
        salary_estimate: analysis.salary_estimate ?? null,
      })
      .select("id")
      .single();

    if (insertError || !newRow) {
      logger.error("Failed to save analysis", { route: "/api/jobs/analyze", cvId, jobTitle }, insertError);
      return errorResponse("Failed to save analysis", 500);
    }

    // SG-4: Persist normalized skill links for the job analysis
    if (listingSkillsForDb.length > 0 && groundTruth) {
      try {
        const taxonomy = await getTaxonomyIndex();
        const skillRows = listingSkillsForDb.map((s) => {
          const result = normalizeSkills([s.name], taxonomy)[0];
          return {
            job_analysis_id: newRow.id,
            skill_id: result.canonical?.id,
            raw_text: s.name,
            is_required: s.is_required,
            is_matched: s.is_matched,
            match_type: result.match_type === "none" ? "exact" : result.match_type,
          };
        }).filter((r) => r.skill_id);

        if (skillRows.length > 0) {
          await supabase.from("job_analysis_skills").insert(skillRows);
        }
      } catch (jaskErr) {
        logger.error("Failed to persist job_analysis_skills (non-critical)", { jobAnalysisId: newRow.id }, jaskErr);
      }
    }

    await consumeRateLimit(supabase, user.id, "/api/jobs/analyze");

    return successResponse({ id: newRow.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Job analysis error", { route: "/api/jobs/analyze" }, error);
    return errorResponse(message, 500);
  }
}
