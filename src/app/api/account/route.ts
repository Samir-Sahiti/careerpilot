import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";

export async function DELETE() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseAdmin = createAdminClient();

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      logger.error("Account deletion failed", { route: "/api/account", userId: user.id }, deleteError);
      return errorResponse("Failed to delete account");
    }

    return successResponse({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Account DELETE error", { route: "/api/account" }, error);
    return errorResponse(message);
  }
}
