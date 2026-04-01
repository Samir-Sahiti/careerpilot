import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Only allow patching a specific set of fields
    const allowed = ["status", "notes", "applied_at", "job_url", "company", "cover_letter_id"];
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error: patchError } = await supabase
      .from("applications")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (patchError || !updated) {
      return NextResponse.json({ error: "Application not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
