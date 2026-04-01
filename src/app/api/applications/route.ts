import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { job_title, company, job_url, status, applied_at, notes, job_analysis_id, cover_letter_id } = body;

    if (!job_title?.trim()) {
      return NextResponse.json({ error: "job_title is required" }, { status: 400 });
    }

    const { data: application, error: insertError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_title: job_title.trim(),
        company: company?.trim() || null,
        job_url: job_url?.trim() || null,
        status: status || "saved",
        applied_at: applied_at || null,
        notes: notes?.trim() || null,
        job_analysis_id: job_analysis_id || null,
        cover_letter_id: cover_letter_id || null,
      })
      .select("*")
      .single();

    if (insertError || !application) {
      return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
    }

    return NextResponse.json(application, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
