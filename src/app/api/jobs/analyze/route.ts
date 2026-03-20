import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { Cv, ParsedCvData } from "@/types";

export async function POST(req: Request) {
  try {
    const { cvId, jobTitle, company, jobRawText } = await req.json();

    if (!cvId || !jobTitle || !jobRawText) {
      return NextResponse.json(
        { error: "Missing required fields: cvId, jobTitle, jobRawText" },
        { status: 400 }
      );
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // ignore in Server Component context
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── CV guard ──────────────────────────────────────────────────────────────
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (cvError || !cvData) {
      return NextResponse.json(
        { error: "Active CV not found or does not belong to you" },
        { status: 404 }
      );
    }

    const cv = cvData as Cv;

    if (!cv.parsed_data) {
      return NextResponse.json(
        { error: "CV has not been parsed yet. Please wait for processing to complete." },
        { status: 400 }
      );
    }

    const parsedCv = cv.parsed_data as ParsedCvData;

    // ── Rate Limiting (max 5 per hour) ────────────────────────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("job_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if (countError) {
      return NextResponse.json(
        { error: "Failed to check analysis rate limit" },
        { status: 500 }
      );
    }

    if (count !== null && count >= 5) {
      return NextResponse.json(
        { error: "Rate limit exceeded. You can only perform 5 job analyses per hour." },
        { status: 429 }
      );
    }

    // ── AI analysis ───────────────────────────────────────────────────────────
    const prompt = `You are an expert technical recruiter and career coach.

A candidate is applying for the following role:

JOB TITLE: ${jobTitle}
${company ? `COMPANY: ${company}` : ""}

JOB DESCRIPTION:
${jobRawText}

---

CANDIDATE PROFILE:
Current Role: ${parsedCv.current_role}
Seniority: ${parsedCv.seniority_level}
Years of Experience: ${parsedCv.years_of_experience}
Skills: ${parsedCv.skills.join(", ")}
Experience:
${parsedCv.experience.map((e) => `- ${e.title} at ${e.company} (${e.duration}): ${e.summary}`).join("\n")}

---

Analyse how well the candidate matches this role. Provide:
1. A fit_score from 0–100 (integer) reflecting overall match quality
2. recommendation: should the candidate 'apply', 'maybe' apply, or 'skip' this role?
3. recommendation_reason: a candid 1-2 sentence explanation for your recommendation
4. matched_skills: skills from the candidate's profile that directly match the role requirements
5. missing_skills: important skills/requirements from the job description the candidate lacks
6. cv_suggestions: 3–5 concrete, actionable suggestions for how the candidate could improve their CV or profile to better match this role (e.g. "Add your experience with Docker to your skills section — the role lists it as required")

Be honest and specific. Base the score on genuine match quality — do not inflate the score.`;

    const { object: analysis } = await generateObject({
      model: anthropic("claude-3-7-sonnet-20250219"),
      schema: z.object({
        fit_score: z.number().int().min(0).max(100),
        recommendation: z.enum(["apply", "maybe", "skip"]),
        recommendation_reason: z.string(),
        matched_skills: z.array(z.string()),
        missing_skills: z.array(z.string()),
        cv_suggestions: z.array(z.string()),
      }),
      prompt,
    });

    // ── Persist result ────────────────────────────────────────────────────────
    const { data: newRow, error: insertError } = await supabase
      .from("job_analyses")
      .insert({
        user_id: user.id,
        cv_id: cvId,
        job_title: jobTitle,
        company: company ?? null,
        job_raw_text: jobRawText,
        fit_score: analysis.fit_score,
        recommendation: analysis.recommendation,
        recommendation_reason: analysis.recommendation_reason,
        matched_skills: analysis.matched_skills,
        missing_skills: analysis.missing_skills,
        cv_suggestions: analysis.cv_suggestions,
      })
      .select("id")
      .single();

    if (insertError || !newRow) {
      console.error("Failed to insert job_analysis:", insertError);
      return NextResponse.json(
        { error: "Failed to save analysis result" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: newRow.id });
  } catch (error: unknown) {
    console.error("Job analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
