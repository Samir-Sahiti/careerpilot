import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ParsedCvData } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { jobTitle, company, jobRawText, jobAnalysisId } = await req.json();

    if (!jobTitle) {
      return NextResponse.json({ error: "jobTitle is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Active CV ─────────────────────────────────────────────────────────────
    const { data: cvData } = await supabase
      .from("cvs")
      .select("parsed_data")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!cvData?.parsed_data) {
      return NextResponse.json(
        { error: "No parsed CV found. Please upload and process a CV first." },
        { status: 400 }
      );
    }

    const cv = cvData.parsed_data as ParsedCvData;

    // ── Enrich from job analysis if provided ──────────────────────────────────
    let resolvedJobRaw = jobRawText || "";
    if (jobAnalysisId && !jobRawText) {
      const { data: analysis } = await supabase
        .from("job_analyses")
        .select("job_raw_text")
        .eq("id", jobAnalysisId)
        .eq("user_id", user.id)
        .single();
      if (analysis) resolvedJobRaw = analysis.job_raw_text;
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/cover-letter/generate");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    // ── AI Generation ─────────────────────────────────────────────────────────
    const systemPrompt = `You are an expert cover letter writer who writes compelling, human-sounding letters.
Your letters are direct, specific, and concise — never generic or padded.
Never use: "I am passionate about", "I am a hard worker", "leverage", "synergy", "circle back", "going forward", or any other corporate filler.
Write in first person. Sound like a real, confident professional — not an AI.`;

    const userPrompt = `Write a professional cover letter for this candidate.

CANDIDATE CV:
${JSON.stringify(cv, null, 2)}

TARGET ROLE: ${jobTitle}
${company ? `COMPANY: ${company}` : ""}
${resolvedJobRaw ? `\nJOB DESCRIPTION:\n${resolvedJobRaw}` : ""}

INSTRUCTIONS:
- 3–4 paragraphs, under 400 words
- Opening paragraph: reference something specific about the role or company (if company is known) that genuinely interests this candidate given their background
- Middle paragraphs: reference 2–3 concrete experiences or skills from the CV that directly match the job requirements — be specific (mention actual companies, projects, technologies)
- Closing: short, confident call to action — no "I look forward to hearing from you at your earliest convenience"
- Do not mention salary
- Do not include any placeholder text like [Company Name] or [Your Name]
- Output only the letter text itself — no subject line, no headers`;

    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const content = text.trim();

    // ── Persist ───────────────────────────────────────────────────────────────
    const { data: letter, error: insertError } = await supabase
      .from("cover_letters")
      .insert({
        user_id: user.id,
        job_analysis_id: jobAnalysisId || null,
        job_title: jobTitle,
        company: company || null,
        content,
      })
      .select("*")
      .single();

    if (insertError || !letter) {
      return NextResponse.json({ error: "Failed to save cover letter" }, { status: 500 });
    }

    await consumeRateLimit(supabase, user.id, "/api/cover-letter/generate");

    return NextResponse.json({ id: letter.id, content: letter.content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
