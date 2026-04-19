import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";

export const maxDuration = 30;

const patchItemSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "done"]),
});

export async function PATCH(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = patchItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Missing required fields", 400);
    }

    const { id, status } = parsed.data;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return errorResponse("Unauthorized", 401);

    const { data: item, error } = await supabase
      .from("roadmap_items")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !item) {
      logger.error("Failed to update roadmap item", { id, status }, error);
      return errorResponse("Failed to update item", 500);
    }

    return successResponse(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Roadmap item patch error", {}, error);
    return errorResponse(message, 500);
  }
}
