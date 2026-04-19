import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { ParsedCvData } from "@/types";

export const maxDuration = 30;

function getRoleFamily(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("engineer") || r.includes("developer") || r.includes("software") || r.includes("backend") || r.includes("frontend") || r.includes("fullstack")) return "engineering";
  if (r.includes("data") || r.includes("ml") || r.includes("machine learning") || r.includes("analyst")) return "data";
  if (r.includes("design") || r.includes("ux") || r.includes("ui")) return "design";
  if (r.includes("product") || r.includes("pm ") || r.includes("product manager")) return "product";
  if (r.includes("devops") || r.includes("platform") || r.includes("infra") || r.includes("sre")) return "devops";
  return "other";
}

function getExperienceBracket(years: number): string {
  if (years <= 2) return "0-2";
  if (years <= 5) return "3-5";
  if (years <= 9) return "6-9";
  return "10+";
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return errorResponse("Unauthorized", 401);

    // Get user's CV to determine cohort membership
    const { data: cv } = await supabase
      .from("cvs")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!cv?.parsed_data) {
      return successResponse({ cohort: null, stats: null, reason: "no_cv" });
    }

    const parsedCv = cv.parsed_data as ParsedCvData;
    const seniority = parsedCv.seniority_level;
    const roleFamily = getRoleFamily(parsedCv.current_role);
    const experienceBracket = getExperienceBracket(parsedCv.years_of_experience);

    // Look up cohort stats (computed weekly by a background job / manual run)
    const { data: cohortStats } = await supabase
      .from("cohort_stats")
      .select("*")
      .eq("seniority_level", seniority)
      .eq("role_family", roleFamily)
      .eq("experience_bracket", experienceBracket)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // User's own application stats
    const { data: userApps } = await supabase
      .from("applications")
      .select("status, outcome_stage_reached, outcome_fit_score_at_apply")
      .eq("user_id", user.id)
      .not("applied_at", "is", null);

    const apps = userApps ?? [];
    const userResponseCount = apps.filter((a) =>
      a.outcome_stage_reached && a.outcome_stage_reached !== "no_response"
    ).length;
    const userAppliedCount = apps.filter((a) => a.outcome_stage_reached != null).length;
    const userResponseRate = userAppliedCount > 0
      ? Math.round((userResponseCount / userAppliedCount) * 100)
      : null;

    const userOfferCount = apps.filter((a) => a.status === "offered").length;
    const userOfferRate = apps.length > 0
      ? Math.round((userOfferCount / apps.length) * 100)
      : null;

    // Cohort must have ≥20 members for privacy
    const cohort = cohortStats && cohortStats.member_count >= 20 ? cohortStats : null;

    return successResponse({
      cohort: {
        seniority_level: seniority,
        role_family: roleFamily,
        experience_bracket: experienceBracket,
      },
      stats: cohort
        ? {
            member_count: cohort.member_count,
            avg_fit_score: cohort.avg_fit_score,
            response_rate_pct: cohort.response_rate_pct,
            offer_rate_pct: cohort.offer_rate_pct,
            computed_at: cohort.computed_at,
          }
        : null,
      user_stats: {
        applied_count: apps.length,
        response_rate: userResponseRate,
        offer_rate: userOfferRate,
      },
      insufficient_data: !cohort,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Cohort stats error", { route: "/api/analytics/cohort" }, error);
    return errorResponse(message, 500);
  }
}
