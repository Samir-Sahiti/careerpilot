import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/**
 * After a CV is parsed, mark any skill-type roadmap items as "done" where
 * the item's normalized skill_id now appears in the user's cv_skills.
 *
 * Returns the number of items auto-completed (0 if none or no skill_id links).
 * Idempotent: already-done items are not touched (status != 'done' filter).
 */
export async function autoCompleteRoadmapItems(
  cvId: string,
  supabase: SupabaseClient
): Promise<number> {
  try {
    // Get all skill IDs recognized from this CV
    const { data: cvSkills, error: cvSkillsError } = await supabase
      .from("cv_skills")
      .select("skill_id")
      .eq("cv_id", cvId);

    if (cvSkillsError || !cvSkills?.length) return 0;

    const skillIds = cvSkills.map((r) => r.skill_id as string);

    // Find skill-type roadmap items that match and aren't yet done
    const { data: matchingItems, error: itemsError } = await supabase
      .from("roadmap_items")
      .select("id")
      .eq("item_type", "skill")
      .neq("status", "done")
      .not("skill_id", "is", null)
      .in("skill_id", skillIds);

    if (itemsError || !matchingItems?.length) return 0;

    const ids = matchingItems.map((r) => r.id as string);

    const { error: updateError } = await supabase
      .from("roadmap_items")
      .update({
        status: "done",
        completed_at: new Date().toISOString(),
        auto_completed_by_cv_id: cvId,
      })
      .in("id", ids);

    if (updateError) {
      logger.error("Failed to auto-complete roadmap items", { cvId }, updateError);
      return 0;
    }

    return ids.length;
  } catch (err) {
    logger.error("autoCompleteRoadmapItems error", { cvId }, err);
    return 0;
  }
}
