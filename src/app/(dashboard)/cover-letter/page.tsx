import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoverLetter, JobAnalysis } from "@/types";
import { CoverLetterClient } from "@/components/cover-letter/CoverLetterClient";

interface PageProps {
  searchParams: Promise<{ job_analysis_id?: string }>;
}

export default async function CoverLetterPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const jobAnalysisId = resolved.job_analysis_id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all cover letters for this user
  const { data: letters } = await supabase
    .from("cover_letters")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Prefill from job analysis if ?job_analysis_id= is present
  let prefillAnalysis: JobAnalysis | null = null;
  if (jobAnalysisId) {
    const { data } = await supabase
      .from("job_analyses")
      .select("*")
      .eq("id", jobAnalysisId)
      .eq("user_id", user.id)
      .single();
    prefillAnalysis = (data as JobAnalysis) ?? null;
  }

  return (
    <CoverLetterClient
      initialLetters={(letters as CoverLetter[]) ?? []}
      prefillAnalysis={prefillAnalysis}
    />
  );
}
