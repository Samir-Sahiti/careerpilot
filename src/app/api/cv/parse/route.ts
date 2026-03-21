import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import mammoth from "mammoth";
// pdf-parse is purely CommonJS and breaks Turbopack ESM resolution when imported normally
const pdfParse = require("pdf-parse");

export async function POST(req: Request) {
  let innerCvId: string | null = null;
  let adminClient: any = null;

  try {
    const { cvId } = await req.json();
    innerCvId = cvId;

    if (!cvId) {
      return NextResponse.json({ error: "Missing cvId" }, { status: 400 });
    }

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
              // ignore
            }
          },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/cv/parse");
    if (!rateLimit.allowed) {
      await fallbackFail(supabase, cvId, rateLimit.message || "Rate limit error");
      return NextResponse.json({ error: rateLimit.message }, { status: 429, headers: { "Retry-After": "3600" } });
    }

    // Verify cv_id belongs to user and get the file path
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("file_path, file_name")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (cvError || !cvData) {
      await fallbackFail(supabase, cvId, "CV not found or unauthorized");
      return NextResponse.json({ error: "CV not found or unauthorized" }, { status: 404 });
    }

    const { file_path, file_name } = cvData;

    // Use service role to completely bypass RLS when fetching the storage object directly
    // This allows backend downloads without worrying about session issues for storage fetching
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    adminClient = supabaseAdmin;

    // Reset to pending if it was a retry
    await supabaseAdmin.from("cvs").update({ parse_status: "pending", parse_error: null }).eq("id", cvId);

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from("cvs")
      .download(file_path);

    if (downloadError || !fileBlob) {
      await fallbackFail(supabaseAdmin, cvId, "Failed to download CV file from storage");
      return NextResponse.json(
        { error: "Failed to download CV file" },
        { status: 500 }
      );
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    // Extract Text based on file extension
    const fileExt = file_name.split(".").pop()?.toLowerCase();
    
    if (fileExt === "pdf") {
      const parsedPdf = await pdfParse(buffer);
      extractedText = parsedPdf.text;
    } else if (fileExt === "docx") {
      const parsedDocx = await mammoth.extractRawText({ buffer });
      extractedText = parsedDocx.value;
    } else {
      await fallbackFail(supabaseAdmin, cvId, "Unsupported file type. Only PDF and DOCX are allowed.");
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF and DOCX are allowed." },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      await fallbackFail(supabaseAdmin, cvId, "No text could be extracted from the file structure");
      return NextResponse.json({ error: "No text could be extracted from the file" }, { status: 400 });
    }

    // AI Parsing with Vercel AI SDK
    const { object } = await generateObject({
      model: anthropic("claude-3-7-sonnet-20250219"),
      schema: z.object({
        current_role: z.string(),
        seniority_level: z.enum(["Junior", "Mid", "Senior", "Lead", "Principal"]),
        years_of_experience: z.number(),
        skills: z.array(z.string()),
        education: z.array(
          z.object({
            degree: z.string(),
            institution: z.string(),
            year: z.number().optional(),
          })
        ),
        experience: z.array(
          z.object({
            title: z.string(),
            company: z.string(),
            duration: z.string(),
            summary: z.string(),
          })
        ),
        achievements: z.array(z.string()),
      }),
      prompt: `Extract structured profile data from this CV:\n\n${extractedText}`,
    });

    // Update the cvs row with parsed text and data
    const { error: updateError } = await supabaseAdmin
      .from("cvs")
      .update({
        parsed_text: extractedText,
        parsed_data: object,
        parse_status: "success",
        parse_error: null
      })
      .eq("id", cvId);

    if (updateError) {
      await fallbackFail(supabaseAdmin, cvId, "Failed to map CV database parsed row");
      return NextResponse.json(
        { error: "Failed to update CV with parsed data" },
        { status: 500 }
      );
    }

    await consumeRateLimit(supabase, user.id, "/api/cv/parse");

    return NextResponse.json({ success: true, cv_id: cvId });
  } catch (error: any) {
    console.error("CV parsing error:", error);
    if (innerCvId && adminClient) {
      await fallbackFail(adminClient, innerCvId, error?.message || "Internal AI execution error");
    }
    return NextResponse.json(
      { error: error?.message || "Internal server error during parsing" },
      { status: 500 }
    );
  }
}

async function fallbackFail(client: any, id: string, message: string) {
  try {
    await client.from("cvs").update({
      parse_status: "failed",
      parse_error: message
    }).eq("id", id);
  } catch (err) {
    console.error("Failed to commit fallback fail state", err);
  }
}
