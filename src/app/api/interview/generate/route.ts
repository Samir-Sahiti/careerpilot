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
    const { jobTitle, companyName, jobAnalysisId } = await req.json();

    if (!jobTitle) {
      return NextResponse.json(
        { error: "Missing required field: jobTitle" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── CV Guard ─────────────────────────────────────────────────────────────
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData) {
      return NextResponse.json(
        { error: "Please upload an active CV before starting an interview." },
        { status: 400 }
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

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/interview/generate");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    // ── AI Generation ────────────────────────────────────────────────────────
    const prompt = `You are an expert technical interviewer and career coach.

I am preparing for an interview for the following role:
JOB TITLE: ${jobTitle}
${companyName ? `COMPANY: ${companyName}` : ""}

Here is my professional profile (parsed from my CV):
Current Role: ${parsedCv.current_role}
Seniority: ${parsedCv.seniority_level}
Years of Experience: ${parsedCv.years_of_experience}
Skills: ${parsedCv.skills.join(", ")}
Experience Summary: ${parsedCv.experience.map(e => `${e.title} at ${e.company}`).join(" | ")}

Please design a tailored mock interview containing exactly 8–10 questions. The distribution should ideally be:
- 3 behavioral questions (focused on scenarios using the STAR method format).
- 3–4 technical questions testing core competencies relevant to the role.
- 2–3 role-specific questions exploring how I would handle situations unique to this role/industry.

Critically: If there is a mismatch between my skills and the role requirements, include questions about how my existing or transferrable skills apply (e.g., if my CV shows React but the role is Vue, ask about adapting between frontend frameworks). Make the questions appropriately challenging for my seniority level (${parsedCv.seniority_level}).

For each question, provide "guidance": 1–2 sentences explaining what a "good" answer should cover or highlight from my specific background.`;

    const { object: result } = await generateObject({
      model: anthropic("claude-3-7-sonnet-20250219"),
      schema: z.object({
        questions: z.array(
          z.object({
            id: z.string().describe("A unique slug or identifier string for the question"),
            question_text: z.string(),
            type: z.enum(["behavioral", "technical", "role-specific"]),
            guidance: z.string(),
          })
        ),
      }),
      prompt,
    });

    // Clean up empty questions or invalid structures just in case
    const cleanQuestions = result.questions.filter((q) => q.question_text?.trim().length > 0);

    if (cleanQuestions.length === 0) {
      throw new Error("Failed to generate valid interview questions.");
    }

    // ── Persist Session ──────────────────────────────────────────────────────
    // Insert into interview_sessions table
    const { data: sessionData, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        job_analysis_id: jobAnalysisId || null,
        questions: cleanQuestions,
      })
      .select("id")
      .single();

    if (sessionError || !sessionData) {
      console.error("Failed to insert interview_sessions:", sessionError);
      return NextResponse.json(
        { error: "Failed to save interview session" },
        { status: 500 }
      );
    }

    await consumeRateLimit(supabase, user.id, "/api/interview/generate");

    return NextResponse.json({ id: sessionData.id });
  } catch (error: unknown) {
    console.error("Interview generation error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
