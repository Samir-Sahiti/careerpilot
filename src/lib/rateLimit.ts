import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export const GLOBAL_AI_LIMIT_PER_HOUR = 10;

export const ROUTE_LIMITS_PER_HOUR: Record<string, number> = {
  "/api/cv/parse": 3,
  "/api/cover-letter/generate": 5,
  "/api/cv/tailor": 2,
  "/api/applications/follow-up": 10,
  "/api/applications/post-mortem": 5,
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  route: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
      .from("rate_limit_events")
      .select("route")
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (error) {
      logger.error("Rate limit check error", { route, userId }, error);
      // Fail closed: deny on DB error to prevent abuse during outages
      return {
        allowed: false,
        message: "Rate limit check temporarily unavailable. Please try again in a moment.",
      };
    }

    if (!events) return { allowed: true };

    // Global cap
    if (events.length >= GLOBAL_AI_LIMIT_PER_HOUR) {
      return {
        allowed: false,
        message: `You've reached the limit for AI requests (${GLOBAL_AI_LIMIT_PER_HOUR} per hour). Please wait before trying again.`,
      };
    }

    // Per-route cap
    const routeLimit = ROUTE_LIMITS_PER_HOUR[route];
    if (routeLimit) {
      const routeCount = events.filter((e) => e.route === route).length;
      if (routeCount >= routeLimit) {
        return {
          allowed: false,
          message: `You've reached the limit for this action (${routeLimit} per hour). Please wait before trying again.`,
        };
      }
    }

    return { allowed: true };
  } catch (err) {
    logger.error("Rate limit exception", { route, userId }, err);
    // Fail closed: deny on unexpected errors
    return {
      allowed: false,
      message: "Rate limit check temporarily unavailable. Please try again in a moment.",
    };
  }
}

export async function consumeRateLimit(
  supabase: SupabaseClient,
  userId: string,
  route: string
) {
  const { error } = await supabase
    .from("rate_limit_events")
    .insert({ user_id: userId, route });

  if (error) logger.error("Failed to insert rate limit event", { route, userId }, error);
}
