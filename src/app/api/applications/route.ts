import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { createApplicationSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Invalid request", 400);
    }

    const { job_title, company, job_url, status, applied_at, notes, job_analysis_id, cover_letter_id } =
      parsed.data;

    if (job_analysis_id) {
      const { data: existingApp } = await supabase
        .from("applications")
        .select("*")
        .eq("job_analysis_id", job_analysis_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingApp) {
        return successResponse(existingApp);
      }
    }

    const { data: application, error: insertError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_title: job_title.trim(),
        company: company?.trim() || null,
        job_url: job_url?.trim() || null,
        status: status ?? "saved",
        applied_at: applied_at ?? null,
        notes: notes?.trim() || null,
        job_analysis_id: job_analysis_id ?? null,
        cover_letter_id: cover_letter_id ?? null,
      })
      .select("*")
      .single();

    if (insertError || !application) {
      logger.error("Failed to create application", { route: "/api/applications", userId: user.id }, insertError);
      return errorResponse("Failed to create application");
    }

    return successResponse(application, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error("Applications POST error", { route: "/api/applications" }, error);
    return errorResponse(message);
  }
}
