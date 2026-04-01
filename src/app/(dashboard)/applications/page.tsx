import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Application } from "@/types";
import { ApplicationsClient } from "@/components/applications/ApplicationsClient";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ApplicationsClient
      initialApplications={(applications as Application[]) ?? []}
    />
  );
}
