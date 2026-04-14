import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, consumeRateLimit } from "@/lib/rateLimit";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import mammoth from "mammoth";
import { applyPdfPolyfills } from "@/lib/pdf/polyfills";
import { parseCvSchema } from "@/lib/validation/schemas";
import { buildCvParsePrompt } from "@/lib/ai/prompts";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse, rateLimitResponse } from "@/lib/apiResponse";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// PDF text extraction using pdfjs-dist directly.
// The text extraction API (getTextContent) has zero DOM/canvas dependencies —
// those are only needed for visual rendering, which we deliberately skip.
// ---------------------------------------------------------------------------
async function extractPdfText(buffer: Buffer): Promise<string> {
  applyPdfPolyfills();

  // pdf.mjs has types; pdf.worker.mjs does not — suppress only the worker import
  const [pdfjs] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — pdfjs-dist worker build has no type declarations
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]);

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
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
    // TextItem has `str`; TextMarkedContent does not — check before accessing
    const pageText = content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  const finalResult = pages.join("\n\n");

  if (!finalResult.trim()) {
    throw new Error(
      "This PDF appears to be a scanned image or contains no selectable text. Please upload a standard PDF text document."
    );
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = parseCvSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0]?.message ?? "Missing cvId", 400);
    }

    const { cvId } = parsed.data;
    innerCvId = cvId;

    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const rateLimit = await checkRateLimit(supabase, user.id, "/api/cv/parse");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.message!);
    }

    const { data: cvData, error: cvError } = await supabase
      .from("cvs")
      .select("file_path, file_name")
      .eq("id", cvId)
      .eq("user_id", user.id)
      .single();

    if (cvError || !cvData) {
      return errorResponse("CV not found or unauthorized", 404);
    }

    const { file_path, file_name } = cvData;

    adminClient = createAdminClient();

    await adminClient
      .from("cvs")
      .update({ parse_status: "pending", parse_error: null })
      .eq("id", cvId);

    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from("cvs")
      .download(file_path);

    if (downloadError || !fileBlob) {
      await markFailed(adminClient, cvId, "Failed to download CV from storage");
      return errorResponse("Failed to download CV file", 500);
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    const fileExt = file_name.split(".").pop()?.toLowerCase();
    let extractedText = "";

    if (fileExt === "pdf") {
      try {
        extractedText = await extractPdfText(buffer);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        logger.error("PDF extraction error", { route: "/api/cv/parse", cvId }, error);
        await markFailed(adminClient, cvId, `PDF Extraction failed: ${message}`);
        return errorResponse(
          "Could not read this PDF. It might be encrypted or corrupted.",
          500
        );
      }
    } else if (fileExt === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileExt === "doc") {
      await markFailed(adminClient, cvId, "Legacy .doc format is not supported for AI analysis.");
      return errorResponse(
        "Legacy Word (.doc) files are not supported. Please save as .docx or .pdf and try again.",
        400
      );
    } else {
      await markFailed(adminClient, cvId, `Unsupported file type: .${fileExt}`);
      return errorResponse(
        `Unsupported file type (.${fileExt}). Only PDF and DOCX are currently supported for AI analysis.`,
        400
      );
    }

    if (!extractedText.trim()) {
      await markFailed(adminClient, cvId, "No readable text could be extracted from this file");
      return errorResponse("No text could be extracted from the file", 400);
    }

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
      prompt: buildCvParsePrompt(extractedText),
    });

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
      return errorResponse("Failed to update CV with parsed data", 500);
    }

    await consumeRateLimit(supabase, user.id, "/api/cv/parse");

    return successResponse({ success: true, cv_id: cvId });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error during parsing";
    logger.error("CV parsing error", { route: "/api/cv/parse", cvId: innerCvId }, error);
    if (innerCvId && adminClient) {
      await markFailed(adminClient, innerCvId, message);
    }
    return errorResponse(message, 500);
  }
}

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
  } catch (err: unknown) {
    logger.error("Failed to write error state to DB", { cvId }, err);
  }
}
