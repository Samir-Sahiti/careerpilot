import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { Cv, ParsedCvData } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { cvId, jobTitle, company, jobRawText } = await req.json();

    if (!cvId || !jobTitle || !jobRawText) {
      return NextResponse.json(
        { error: "Missing required fields: cvId, jobTitle, jobRawText" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
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
      return NextResponse.json({ error: "Active CV not found" }, { status: 404 });
    }

    const cv = cvData as Cv;
    if (!cv.parsed_data) {
      return NextResponse.json({ error: "CV has not been parsed yet." }, { status: 400 });
    }

    const parsedCv = cv.parsed_data as ParsedCvData;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/jobs/analyze");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    // ── AI analysis ───────────────────────────────────────────────────────────
    const prompt = `You are an expert technical recruiter and career coach.

A candidate is applying for:
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

Provide:
1. fit_score (0–100 integer) — genuine match quality, do not inflate
2. recommendation: 'apply' / 'maybe' / 'skip' — honest assessment
3. recommendation_reason: 1–2 candid sentences
4. matched_skills: candidate skills that directly match the role
5. missing_skills: required skills the candidate lacks
6. cv_suggestions: 3–5 specific, actionable improvements (e.g. "Add Docker to skills — the role lists it as required")
7. salary_estimate: a realistic salary range for this role in the likely market. Be conservative and honest.
   - Infer currency and location from the job listing (default to USD if unclear)
   - low/mid/high should reflect real market rates for the seniority level inferred from the listing
   - factors: list 3–5 key things influencing the range (e.g. "Remote-friendly", "Series B startup", "Requires 5+ years")
   - negotiation_tip: 1–2 sentences on the candidate's best leverage points given their matched skills`;

    const { object: analysis } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: z.object({
        fit_score: z.number().int(),
        recommendation: z.enum(["apply", "maybe", "skip"]),
        recommendation_reason: z.string(),
        matched_skills: z.array(z.string()),
        missing_skills: z.array(z.string()),
        cv_suggestions: z.array(z.string()),
        salary_estimate: z.object({
          currency: z.string(),
          low: z.number(),
          mid: z.number(),
          high: z.number(),
          factors: z.array(z.string()),
          negotiation_tip: z.string(),
        }).nullable().optional(),
      }),
      prompt,
    });

    // ── Persist ───────────────────────────────────────────────────────────────
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
        salary_estimate: analysis.salary_estimate ?? null,
      })
      .select("id")
      .single();

    if (insertError || !newRow) {
      return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
    }

    await consumeRateLimit(supabase, user.id, "/api/jobs/analyze");

    return NextResponse.json({ id: newRow.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
