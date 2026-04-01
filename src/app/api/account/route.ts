import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();

    // 1. Get the current logged in user from standard auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Instantiate Service Role client correctly bypassing RLS natively
    const supabaseAdmin = createAdminClient();

    // 3. Delete the account globally (Casscading postgres deletes rule)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Account deletion anomaly", deleteError);
      return NextResponse.json({ error: "Failed to irreversibly delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Account has been eliminated" });
  } catch (error: any) {
    console.error("Critical error in /api/account", error);
    return NextResponse.json({ error: "Server caught unexpected termination" }, { status: 500 });
  }
}
