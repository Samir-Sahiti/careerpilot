import { SupabaseClient } from "@supabase/supabase-js";

export const GLOBAL_AI_LIMIT_PER_HOUR = 10;
export const ROUTE_LIMITS_PER_HOUR: Record<string, number> = {
  "/api/cv/parse": 3,
};

export async function checkRateLimit(supabase: SupabaseClient, userId: string, route: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 1. Fetch all requests by this user in the last hour
    const { data: events, error } = await supabase
      .from("rate_limit_events")
      .select("route")
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (error) {
      console.error("Rate limit check error:", error);
      // Fail closed or open? Let's fail open if DB is struggling to allow user functionality, but ideally fail closed.
      // We will allow if DB error for now.
      return { allowed: true };
    }

    if (!events) return { allowed: true };

    const totalRequests = events.length;

    // RULE 1: Global Maximum
    if (totalRequests >= GLOBAL_AI_LIMIT_PER_HOUR) {
      return { 
        allowed: false, 
        message: "You've reached the overall limit for AI requests (10 per hour). Please wait before trying again." 
      };
    }

    // RULE 2: Route-Specific Maximum
    const routeLimit = ROUTE_LIMITS_PER_HOUR[route];
    if (routeLimit) {
      const routeRequests = events.filter(e => e.route === route).length;
      if (routeRequests >= routeLimit) {
        return { 
          allowed: false, 
          message: `You've reached the specific limit for this action (${routeLimit} per hour). Please wait before trying again.` 
        };
      }
    }

    return { allowed: true };

  } catch (error) {
    console.error("Rate limit exception:", error);
    return { allowed: true };
  }
}

// Ensure you call this function ONLY if the cache misses and AI is going to be consumed.
export async function consumeRateLimit(supabase: SupabaseClient, userId: string, route: string) {
  const { error } = await supabase
    .from("rate_limit_events")
    .insert({ user_id: userId, route });
    
  if (error) {
    console.error("Failed to insert rate limit event:", error);
  }
}
