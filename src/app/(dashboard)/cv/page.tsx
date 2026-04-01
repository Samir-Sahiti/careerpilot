import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CVUpload } from "@/components/cv/CVUpload";
import { ProfileContainer } from "@/components/cv/ProfileContainer";
import { CVParsingStatus } from "@/components/cv/CVParsingStatus";
import { Cv } from "@/types";

export default async function CvPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the active CV — include parse_status and parse_error
  const { data: cv, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  // Condition 1: No active CV — show the upload dropzone
  if (!cv || error) {
    return <CVUpload />;
  }

  const typedCv = cv as Cv & { parse_status: string; parse_error: string | null };

  // Condition 2: Parsed successfully — show the profile
  if (typedCv.parsed_data) {
    return <ProfileContainer cv={typedCv} />;
  }

  // Condition 3: Pending or failed — delegate to the polling client component
  // This handles both the "just uploaded" case AND the "came back to the page" case.
  return (
    <CVParsingStatus
      cvId={typedCv.id}
      initialStatus={typedCv.parse_status ?? "pending"}
      initialError={typedCv.parse_error ?? null}
    />
  );
}
