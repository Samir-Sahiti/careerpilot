import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const { questionIndex, answer, feedback, score, overall_score } = await req.json();

    if (overall_score !== undefined) {
      // Fast path: just update overall_score
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { error: updateError } = await supabase
        .from("interview_sessions")
        .update({ overall_score })
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
      return NextResponse.json({ success: true });
    }

    if (questionIndex === undefined || !answer || !feedback) {
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

    // 1. Fetch current session to get existing JSONB array
    const { data: session, error: fetchError } = await supabase
      .from("interview_sessions")
      .select("questions")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const questions = [...(session.questions as any[])];

    // 2. Modify specific index
    if (questions[questionIndex]) {
      questions[questionIndex] = {
        ...questions[questionIndex],
        user_answer: answer,
        feedback: feedback,
        score: score ?? null,
      };
    }

    // 3. Update the DB
    const { error: updateError } = await supabase
      .from("interview_sessions")
      .update({ questions })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("PATCH session error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
