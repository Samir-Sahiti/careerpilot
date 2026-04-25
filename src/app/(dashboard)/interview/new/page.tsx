import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewInterviewForm } from "@/components/interview/NewInterviewForm";
import Link from "next/link";
import { ArrowLeft, Mic } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewInterviewPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const jobId = typeof resolvedParams.job_id === "string" ? resolvedParams.job_id : undefined;

  const supabase = await createClient();

  // Validate session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let jobTitle = "";
  let company = "";
  let verifiedJobId = undefined;

  // ── Pre-fill data if job_id was passed ─────────────────────────────────────
  if (jobId) {
    const { data: jobData, error } = await supabase
      .from("job_analyses")
      .select("job_title, company")
      .eq("id", jobId)
      .eq("user_id", user.id) // security strict scoping
      .maybeSingle();

    if (!error && jobData) {
      jobTitle = jobData.job_title;
      company = jobData.company || "";
      verifiedJobId = jobId;
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div>
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Mic className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
          Start Mock Interview
        </h1>
        <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-2xl">
          We&apos;ll generate a personalised technical and behavioural interview tailored precisely 
          to your CV and the role you&apos;re applying for.
        </p>
      </div>

      <NewInterviewForm 
        initialJobTitle={jobTitle} 
        initialCompany={company} 
        jobAnalysisId={verifiedJobId} 
      />
    </div>
  );
}
