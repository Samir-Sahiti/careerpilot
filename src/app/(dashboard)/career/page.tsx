import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AutoGenerateRoadmap } from "@/components/career/AutoGenerateRoadmap";
import { RoadmapDisplay } from "@/components/career/RoadmapDisplay";
import Link from "next/link";
import { FileUp, Target } from "lucide-react";

export default async function CareerLadderPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Check CV Status
  const { data: cv, error: cvError } = await supabase
    .from("cvs")
    .select("uploaded_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  // Show "Upload CV" Empty State
  if (!cv || cvError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-fade-in-up text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-blue-900/20 border border-blue-500/30 rounded-3xl flex items-center justify-center rotate-3 relative hover:rotate-0 transition-transform">
          <FileUp className="w-10 h-10 text-blue-400" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Career Ladder requires a CV
          </h1>
          <p className="text-gray-400 text-lg">
            Upload a resume to set your baseline and our AI will build concrete career progression tracks for you.
          </p>
        </div>

        <Link
          href="/cv"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20 inline-flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          Go Upload CV
        </Link>
      </div>
    );
  }

  // 2. Fetch Latest Roadmap
  const { data: roadmap } = await supabase
    .from("career_roadmaps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Routing Layer Logic
  const needsGeneration = !roadmap || new Date(roadmap.created_at) < new Date(cv.uploaded_at);

  if (needsGeneration) {
    return <AutoGenerateRoadmap />;
  }

  return <RoadmapDisplay roadmap={roadmap} />;
}
