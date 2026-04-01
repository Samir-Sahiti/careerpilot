import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import mammoth from "mammoth";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// PDF text extraction using pdfjs-dist directly.
// We use the legacy/build which is the CommonJS Node.js-compatible bundle.
// The text extraction API (getTextContent) has zero DOM/canvas dependencies —
// those are only needed for visual rendering, which we deliberately skip.
// ---------------------------------------------------------------------------
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Polyfill browser-only APIs if they don't exist (Node.js environment requirement for PDF.js)
  if (typeof global !== "undefined") {
    if (!(global as any).DOMMatrix) {
      (global as any).DOMMatrix = class DOMMatrix {
        constructor() {}
        static fromFloat32Array() { return new DOMMatrix(); }
        static fromFloat64Array() { return new DOMMatrix(); }
      };
    }
    if (!(global as any).DOMPoint) {
      (global as any).DOMPoint = class DOMPoint {
        constructor() {}
      };
    }
    if (!(global as any).DOMRect) {
      (global as any).DOMRect = class DOMRect {
        constructor() {}
      };
    }
  }

  const [pdfjs, pdfWorker] = await Promise.all([
    // @ts-ignore
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    // @ts-ignore
    import("pdfjs-dist/legacy/build/pdf.worker.mjs")
  ]);

  // Set the worker source to the imported worker module to satisfy the loader
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  }

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  const finalResult = pages.join("\n\n");
  
  if (!finalResult.trim()) {
    throw new Error("This PDF appears to be a scanned image or contains no selectable text. Please upload a standard PDF text document.");
  }

  return finalResult;
}

// ---------------------------------------------------------------------------
// POST /api/cv/parse
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  let innerCvId: string | null = null;
  let adminClient: ReturnType<typeof createAdminClient> | null = null;

  try {
    const { cvId } = await req.json();
    innerCvId = cvId;

    if (!cvId) {
      return NextResponse.json({ error: "Missing cvId" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/cv/parse");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    // Verify cv_id belongs to the authenticated user
    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("file_path, file_name")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (cvError || !cvData) {
      return NextResponse.json(
        { error: "CV not found or unauthorized" },
        { status: 404 }
      );
    }

    const { file_path, file_name } = cvData;

    // Use admin client for storage operations (bypasses RLS)
    adminClient = createAdminClient();

    // Mark as pending (useful for retries)
    await adminClient
      .from("cvs")
      .update({ parse_status: "pending", parse_error: null })
      .eq("id", cvId);

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from("cvs")
      .download(file_path);

    if (downloadError || !fileBlob) {
      await markFailed(adminClient, cvId, "Failed to download CV from storage");
      return NextResponse.json(
        { error: "Failed to download CV file" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const fileExt = file_name.split(".").pop()?.toLowerCase();
    let extractedText = "";

    // ── Text Extraction ───────────────────────────────────────────────────────
    if (fileExt === "pdf") {
      try {
        extractedText = await extractPdfText(buffer);
      } catch (err: any) {
        console.error("PDF Extraction Error:", err);
        await markFailed(adminClient, cvId, `PDF Extraction failed: ${err.message || "Unknown error"}`);
        return NextResponse.json({ error: "Could not read this PDF. It might be encrypted or corrupted." }, { status: 500 });
      }
    } else if (fileExt === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileExt === "doc") {
      // Mammoth and most serverless-friendly parsers do not support legacy .doc
      await markFailed(adminClient, cvId, "Legacy .doc format is not supported for AI analysis.");
      return NextResponse.json(
        { error: "Legacy Word (.doc) files are not supported. Please save as .docx or .pdf and try again." },
        { status: 400 }
      );
    } else {
      await markFailed(adminClient, cvId, `Unsupported file type: .${fileExt}`);
      return NextResponse.json(
        { error: `Unsupported file type (.${fileExt}). Only PDF and DOCX are currently supported for AI analysis.` },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      await markFailed(
        adminClient,
        cvId,
        "No readable text could be extracted from this file"
      );
      return NextResponse.json(
        { error: "No text could be extracted from the file" },
        { status: 400 }
      );
    }

    // ── AI Parsing ────────────────────────────────────────────────────────────
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
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
      prompt: `Extract structured profile data from this CV / Resume:\n\n${extractedText}`,
    });

    // ── Persist Results ───────────────────────────────────────────────────────
    const { error: updateError } = await adminClient
      .from("cvs")
      .update({
        parsed_text: extractedText,
        parsed_data: object,
        parse_status: "success",
        parse_error: null,
      })
      .eq("id", cvId);

    if (updateError) {
      await markFailed(adminClient, cvId, "Failed to save parsed CV data");
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
      await markFailed(
        adminClient,
        innerCvId,
        error?.message || "Internal server error"
      );
    }
    return NextResponse.json(
      { error: error?.message || "Internal server error during parsing" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function markFailed(
  client: ReturnType<typeof createAdminClient>,
  cvId: string,
  message: string
) {
  try {
    await client
      .from("cvs")
      .update({ parse_status: "failed", parse_error: message })
      .eq("id", cvId);
  } catch (err) {
    console.error("Failed to write error state to DB:", err);
  }
}
