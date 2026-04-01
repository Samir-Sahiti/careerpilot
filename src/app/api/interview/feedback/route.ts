import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { Cv, ParsedCvData } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, question, type, jobTitle, company } = await req.json();

    if (!prompt || !question || !type || !jobTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── CV Guard ─────────────────────────────────────────────────────────────
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (cvError || !cvData || !cvData.parsed_data) {
      return NextResponse.json(
        { error: "CV data not found" },
        { status: 400 }
      );
    }

    const parsedCv = cvData.parsed_data as ParsedCvData;

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/interview/feedback");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429, headers: { "Retry-After": "3600" } });
    }
    
    // We consume right away before streaming since we can't cleanly hook post-stream in Serverless easily
    await consumeRateLimit(supabase, user.id, "/api/interview/feedback");

    // ── AI Stream ────────────────────────────────────────────────────────────

    let evaluationCriteria = `
You are evaluating the answer based on:
1. Relevance to the role of ${jobTitle} ${company ? `at ${company}` : ""}
2. The candidate's background (${parsedCv.current_role}, ${parsedCv.years_of_experience} years exp)
    `;

    if (type === "behavioral") {
      evaluationCriteria += `
3. **STAR Method Framework**: The answer MUST follow the STAR format (Situation, Task, Action, Result). 
Explicitly call out whether they successfully hit all 4 points, or what they missed.
      `;
    }

    const systemMessage = `
You are a senior hiring manager conducting a mock interview.
The candidate is answering a **${type}** interview question.

QUESTION: "${question}"

${evaluationCriteria}

Provide constructive, directly actionable feedback. Be professional but honest. A score of 60 means they need serious improvement; a score of 85+ means an excellent answer.

You MUST format your output EXACTLY like this using Markdown:
**Feedback:**
(2-4 sentences evaluating their answer overall)

**Strengths:**
- (Bullet point 1)
- (Bullet point 2)

**Improvements:**
- (Bullet point 1)
- (Bullet point 2)

[SCORE: XX]
(Where XX is an integer between 0 and 100 representing their score. EXACTLY this format at the very end).
    `;

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      messages: [
        { role: "system", content: systemMessage.trim() },
        { role: "user", content: prompt }
      ],
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Stream error", error);
    return new Response(error.message || "Internal server error", { status: 500 });
  }
}
