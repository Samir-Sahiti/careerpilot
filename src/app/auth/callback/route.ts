import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", user.id)
        .single();

      // New users (no onboarding_completed_at) go to CV upload onboarding
      if (!profile?.onboarding_completed_at) {
        return NextResponse.redirect(`${origin}/onboarding/cv`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
