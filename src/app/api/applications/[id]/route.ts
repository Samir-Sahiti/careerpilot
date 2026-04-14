import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { patchApplicationSchema } from "@/lib/validation/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = patchApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Invalid request", 400);
    }

    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const { data: updated, error: patchError } = await supabase
      .from("applications")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (patchError || !updated) {
      return errorResponse("Application not found or update failed", 404);
    }

    return successResponse(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Application PATCH error", { route: "/api/applications/[id]" }, error);
    return errorResponse(message);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      logger.error("Application DELETE error", { route: "/api/applications/[id]", userId: user.id }, deleteError);
      return errorResponse("Failed to delete application");
    }

    return successResponse({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Application DELETE error", { route: "/api/applications/[id]" }, error);
    return errorResponse(message);
  }
}
