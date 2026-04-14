import { describe, it, expect } from "vitest";
import { checkRateLimit, GLOBAL_AI_LIMIT_PER_HOUR, ROUTE_LIMITS_PER_HOUR } from "../rateLimit";
import type { SupabaseClient } from "@supabase/supabase-js";

function makeSupabase(events: { route: string }[] | null, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: events, error }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("checkRateLimit", () => {
  it("allows requests when under limits", async () => {
    const supabase = makeSupabase([]);
    const result = await checkRateLimit(supabase, "user-1", "/api/jobs/analyze");
    expect(result.allowed).toBe(true);
  });

  it("blocks when global limit is reached", async () => {
    const events = Array(GLOBAL_AI_LIMIT_PER_HOUR).fill({ route: "/api/jobs/analyze" });
    const supabase = makeSupabase(events);
    const result = await checkRateLimit(supabase, "user-1", "/api/jobs/analyze");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain(String(GLOBAL_AI_LIMIT_PER_HOUR));
  });

  it("blocks when per-route limit is reached", async () => {
    const cvParseLimit = ROUTE_LIMITS_PER_HOUR["/api/cv/parse"];
    const events = Array(cvParseLimit).fill({ route: "/api/cv/parse" });
    const supabase = makeSupabase(events);
    const result = await checkRateLimit(supabase, "user-1", "/api/cv/parse");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain(String(cvParseLimit));
  });

  it("fails CLOSED (denies) on DB error", async () => {
    const supabase = makeSupabase(null, new Error("DB connection failed"));
    const result = await checkRateLimit(supabase, "user-1", "/api/jobs/analyze");
    expect(result.allowed).toBe(false);
  });

  it("allows requests that are under the per-route limit", async () => {
    const cvParseLimit = ROUTE_LIMITS_PER_HOUR["/api/cv/parse"];
    const events = Array(cvParseLimit - 1).fill({ route: "/api/cv/parse" });
    const supabase = makeSupabase(events);
    const result = await checkRateLimit(supabase, "user-1", "/api/cv/parse");
    expect(result.allowed).toBe(true);
  });
});
