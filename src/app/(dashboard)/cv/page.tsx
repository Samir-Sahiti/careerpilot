import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CVUpload } from "@/components/cv/CVUpload";
import { ProfileContainer } from "@/components/cv/ProfileContainer";
import { Cv } from "@/types";

export default async function CvPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if they have an active CV
  const { data: cv, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  // Condition 1: No active CV — render the upload dropzone
  if (!cv || error) {
    return <CVUpload />;
  }

  const typedCv = cv as Cv;

  // Condition 2: CV uploaded, but AI parsed data is not populated yet
  if (!typedCv.parsed_data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          AI is actively processing your CV...
        </h2>
        <p className="text-gray-400">
          This shouldn&apos;t take more than a minute. Relax.
        </p>
      </div>
    );
  }

  // Condition 3: CV has been successfully parsed — render the profile display
  return <ProfileContainer cv={typedCv} />;
}
