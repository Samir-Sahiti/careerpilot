import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar acts as the navigation for the entire dashboard */}
      <Sidebar userEmail={user.email ?? "unknown@user.com"} displayName={displayName} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto cp-main-content">
        {/* We add a div with max-w to constrain the content nicely, same as landing page */}
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
