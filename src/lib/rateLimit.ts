import { SupabaseClient } from "@supabase/supabase-js";

export const GLOBAL_AI_LIMIT_PER_HOUR = 10;

export const ROUTE_LIMITS_PER_HOUR: Record<string, number> = {
  "/api/cv/parse":                3,
  "/api/cover-letter/generate":   5,
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
      console.error("Rate limit check error:", error);
      return { allowed: true }; // fail open on DB error
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
    console.error("Rate limit exception:", err);
    return { allowed: true };
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

  if (error) console.error("Failed to insert rate limit event:", error);
}
