import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Protect the route
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/login");
  }

  // Fetch their active display name from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const currentDisplayName = profile?.full_name || "";
  const email = user.email || "";

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Account Settings
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Update your profile display name, change credentials, or manage your account footprint.
        </p>
      </div>

      <div className="max-w-3xl">
        <SettingsForm 
          initialDisplayName={currentDisplayName}
          email={email}
        />
      </div>
    </div>
  );
}
