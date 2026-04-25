"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloud, FileType, CheckCircle2, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function CVUpload({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "parsing" | "success" | "failed">("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [currentCvId, setCurrentCvId] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setUploadState("uploading");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to upload a CV");
        setUploadState("idle");
        return;
      }

      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // 2. Set is_active = false on all previous CVs
      const { error: updateError } = await supabase
        .from("cvs")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);
        
      if (updateError) {
        console.error("Failed to deactivate old CVs:", updateError);
      }

      // 3. Insert new row
      const { data: insertData, error: insertError } = await supabase
        .from("cvs")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          is_active: true
        })
        .select()
        .single();
        
      if (insertError) {
        throw new Error(`Database record failed: ${insertError.message}`);
      }

      const cvId = insertData.id;
      setCurrentCvId(cvId);

      // 4. Fire Parse & Poll
      setUploadState("parsing");
      setParseError(null);

      dispatchParse(cvId);
      pollStatus(cvId, Date.now());

    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
      setUploadState("idle");
    }
  };

  const dispatchParse = async (cvId: string) => {
    try {
      const res = await fetch("/api/cv/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadState("failed");
        setParseError(data.error || `Server responded with ${res.status}`);
      }
    } catch (err) {
      console.error("Parse request disconnected", err);
      setUploadState("failed");
      setParseError("Network request failed");
    }
  };

  const pollStatus = (cvId: string, startTime: number) => {
    const check = async () => {
      if (Date.now() - startTime > 120_000) {
        setUploadState("failed");
        setParseError("Parsing timed out after 2 minutes. Claude might be heavily overloaded.");
        return;
      }

      const { data, error } = await supabase.from("cvs").select("parse_status, parse_error").eq("id", cvId).single();
      
      if (!error && data) {
        if (data.parse_status === "success") {
          setUploadState("success");
          toast.success("CV uploaded and parsed successfully!");
          setTimeout(() => {
            router.refresh();
            if (onCancel) onCancel();
          }, 1500);
          return; // Exit loop
        } else if (data.parse_status === "failed") {
          setUploadState("failed");
          setParseError(data.parse_error || "Failed to extract CV context.");
          return; // Exit loop
        }
      }
      
      // Still pending or network blip, wait 5s and poll again
      setTimeout(check, 5000);
    };
    check();
  };

  const handleRetry = () => {
    if (!currentCvId) return;
    setUploadState("parsing");
    setParseError(null);
    dispatchParse(currentCvId);
    pollStatus(currentCvId, Date.now());
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDropRejected: (files) => {
      const error = files[0]?.errors[0];
      if (error?.code === "file-too-large") {
        toast.error("File is larger than 5MB limit");
      } else if (error?.code === "file-invalid-type") {
        toast.error("Only PDF, DOCX, and DOC files are accepted");
      } else {
        toast.error(error?.message || "File rejected");
      }
    },
    onDropAccepted: (files) => handleUpload(files[0]),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative">
      {onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div>
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          {onCancel ? "Update Your CV / Resume" : "Upload Your CV / Resume"}
        </h1>
        <p className="text-gray-400 leading-relaxed">
          Upload your latest CV or Resume in PDF, DOCX, or DOC format. CareerOS&apos;s AI will analyse your background to power all dashboard features.
        </p>
      </div>

      <div
        {...(uploadState === "idle" ? getRootProps() : {})}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${uploadState === "idle" ? "cursor-pointer" : "cursor-default"} flex flex-col items-center justify-center min-h-[300px] gap-4 ${
          isDragActive
            ? "border-amber-500 bg-amber-500/10"
            : uploadState === "failed" 
              ? "border-red-500/50 bg-red-500/5"
              : "border-[#2d2a26] bg-[#1a1916] hover:border-amber-500/50 hover:bg-[#1a1916]/80"
        } ${uploadState === "uploading" ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input {...(uploadState === "idle" ? getInputProps() : {})} disabled={uploadState !== "idle"} />
        
        {uploadState === "idle" && (
          <>
            <div className="p-4 bg-amber-500/10 rounded-full mb-2">
              <UploadCloud className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-medium text-white mb-1">
                {isDragActive ? "Drop your CV / Resume here" : "Click or drag and drop your CV / Resume"}
              </p>
              <p className="text-sm text-gray-500">
                PDF, DOCX, or DOC (max 5MB)
              </p>
            </div>
          </>
        )}

        {uploadState === "uploading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            <p className="text-xl font-medium text-white">Uploading CV...</p>
          </div>
        )}

        {uploadState === "parsing" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            <p className="text-xl font-medium text-white">Analysing with AI...</p>
            <p className="text-sm text-gray-500">This might take a few seconds</p>
          </div>
        )}

        {uploadState === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-full mb-1">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-xl font-medium text-white">Upload complete!</p>
          </div>
        )}

        {uploadState === "failed" && (
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div className="p-3 bg-red-500/10 rounded-full mb-1">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-xl font-medium text-white">Analysis Failed</p>
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 break-words w-full">
              {parseError || "Internal processing error."}
            </p>
            <p className="text-[11px] text-gray-500 italic px-4">
              Tip: If the error persists, try converting your file to a standard PDF.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setUploadState("idle");
                  setParseError(null);
                  setCurrentCvId(null);
                }}
                className="px-6 py-2.5 bg-[#2d2a26] hover:bg-[#3a3632] text-white rounded-lg font-medium transition-colors border border-[#2d2a26]"
              >
                Upload Different File
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
              >
                Retry Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 rounded-xl border flex flex-col sm:flex-row items-start gap-4" style={{ backgroundColor: "#0f0e0c", borderColor: "#2d2a26" }}>
        <div className="p-2.5 bg-amber-500/10 rounded-lg shrink-0">
          <FileType className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-base mb-1">Why do we need your CV / Resume?</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your file is the foundation for CareerOS. It allows our AI to instantly identify your skill gaps when you look at a job listing, ask highly relevant mock interview questions, and build realistic career roadmaps based on your actual experience.
          </p>
        </div>
      </div>
    </div>
  );
}
