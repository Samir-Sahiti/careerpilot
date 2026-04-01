import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { ParsedCvData } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    let force = false;
    try {
      const body = await req.json();
      force = !!body.force;
    } catch {}

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch Active CV
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData || !cvData.parsed_data) {
      return NextResponse.json({ error: "No active parsed CV exists. Please analyse a CV first." }, { status: 400 });
    }

    const { uploaded_at, parsed_data } = cvData;

    // 2. Cache Check: See if a fresher roadmap exists (skip if force=true)
    if (!force) {
      const { data: latestRoadmap } = await supabase
        .from("career_roadmaps")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRoadmap && new Date(latestRoadmap.created_at) > new Date(uploaded_at)) {
        // Roadmap is newer than the CV; just return the cached one map
        return NextResponse.json({ roadmap: latestRoadmap, cached: true });
      }
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/career/roadmap");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    // 3. AI Generation
    const cv = parsed_data as ParsedCvData;
    const systemPrompt = `
You are an expert career advisor and technical recruiter.
Review the candidate's CV and generate 2 to 3 distinct, highly realistic career progression paths for them.

CRITICAL INSTRUCTIONS:
- Ground your advice in reality. If a candidate has 1-2 years of experience, do NOT suggest they will be a CTO, VP, or Principal Engineer within 2 years. Career steps must be incremental and plausible.
- Provide distinct paths (e.g. Individual Contributor Track, Management Track, Specialized Pivot Track).
- Analyze their current skills and identify EXACTLY what technical/soft skills are 'missing' for that next role step.
- Suggest concrete recommended projects to build those exact skills.
    `;

    const userPrompt = `
Here is the candidate's CV:
${JSON.stringify(cv, null, 2)}

Provide the structured career roadmap paths.
    `;

    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      system: systemPrompt.trim(),
      prompt: userPrompt.trim(),
      schema: z.object({
        current_role: z.string(),
        paths: z.array(z.object({
          path_title: z.string().describe('e.g. "IC Track", "Management Track"'),
          next_role: z.string().describe('e.g. "Senior Frontend Developer"'),
          timeline_estimate: z.string().describe('e.g. "12–18 months"'),
          missing_skills: z.array(z.string()).describe('List of specific skills needed formatted exactly as "Skill Name: Why it exactly matters for this role"'),
          recommended_projects: z.array(z.string()).describe('Concrete, highly actionable portfolio projects to build missing skills (e.g. "Build a production REST API with tracing... because XYZ")'),
          experience_needed: z.string().describe('Plaintext description of the type of experience they must gain first'),
        })).min(2).max(3)
      })
    });

    // 4. Save to DB
    const { data: insertedRoadmap, error: insertError } = await supabase
      .from("career_roadmaps")
      .insert({
        user_id: user.id,
        current_role: object.current_role,
        paths: object.paths
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    await consumeRateLimit(supabase, user.id, "/api/career/roadmap");

    return NextResponse.json({ roadmap: insertedRoadmap, cached: false });

  } catch (error: any) {
    console.error("Roadmap generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate roadmap" },
      { status: 500 }
    );
  }
}
