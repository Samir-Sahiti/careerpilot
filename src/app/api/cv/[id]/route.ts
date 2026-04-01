import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const cvId = resolvedParams.id;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch CV record to get file_path before deleting
    const { data: cvData, error: fetchError } = await supabase
      .from("cvs")
      .select("file_path")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !cvData) {
      return NextResponse.json({ error: "CV not found or unauthorized" }, { status: 404 });
    }

    const { file_path } = cvData;

    // 2. Use Admin Client to delete file from storage and delete record from DB
    const adminClient = createAdminClient();

    // Delete from storage
    const { error: storageError } = await adminClient.storage
      .from("cvs")
      .remove([file_path]);

    if (storageError) {
      console.error("Storage deletion error during CV cleanup:", storageError);
      // We continue since the DB record deletion is the most important part for UI reset
    }

    // Delete from database
    const { error: dbError } = await adminClient
      .from("cvs")
      .delete()
      .eq("id", cvId)
      .eq("user_id", user.id);

    if (dbError) {
      return NextResponse.json({ error: "Failed to delete CV record from database" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CV deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
