"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloud, Loader2, CheckCircle2, X, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function OnboardingCvPage() {
  const router = useRouter();
  const supabase = createClient();
  const [state, setState] = useState<"idle" | "uploading" | "parsing" | "success" | "failed">("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [currentCvId, setCurrentCvId] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setState("uploading");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("cvs").upload(filePath, file);
      if (uploadError) throw new Error(uploadError.message);

      await supabase.from("cvs").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);

      const { data: inserted, error: insertError } = await supabase
        .from("cvs")
        .insert({ user_id: user.id, file_name: file.name, file_path: filePath, is_active: true })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);

      const cvId = inserted.id;
      setCurrentCvId(cvId);
      setState("parsing");
      setParseError(null);

      // Fire parse
      fetch("/api/cv/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      }).catch(() => null);

      // Poll for success
      const start = Date.now();
      const poll = async () => {
        if (Date.now() - start > 120_000) {
          setState("failed");
          setParseError("Parsing timed out. Please try again.");
          return;
        }
        const { data } = await supabase.from("cvs").select("parse_status, parse_error").eq("id", cvId).single();
        if (data?.parse_status === "success") {
          setState("success");
          toast.success("CV uploaded! Now let's see how you match your first job.");
          setTimeout(() => router.push("/onboarding/first-analysis"), 1500);
        } else if (data?.parse_status === "failed") {
          setState("failed");
          setParseError(data.parse_error || "Failed to parse CV.");
        } else {
          setTimeout(poll, 5000);
        }
      };
      poll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setState("idle");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxSize: 5 * 1024 * 1024,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      toast.error(err?.code === "file-too-large" ? "File exceeds 5MB" : "Only PDF, DOCX, DOC accepted");
    },
    onDropAccepted: (files) => handleUpload(files[0]),
    disabled: state !== "idle",
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}>
            Career<span style={{ color: "#f59e0b" }}>OS</span>
          </span>
        </div>

        <div className="bg-[#1a1916] border border-[#2d2a26] rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
              Upload your CV
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your CV powers every CareerOS feature. Upload it once and we&apos;ll match you to jobs instantly.
            </p>
          </div>

          <div
            {...(state === "idle" ? getRootProps() : {})}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 text-center transition-all min-h-[220px] ${
              state === "idle" ? "cursor-pointer" : "cursor-default"
            } ${
              isDragActive ? "border-amber-500 bg-amber-500/10" :
              state === "failed" ? "border-red-500/50 bg-red-500/5" :
              "border-[#2d2a26] hover:border-amber-500/50"
            }`}
          >
            <input {...(state === "idle" ? getInputProps() : {})} />

            {state === "idle" && (
              <>
                <div className="p-3 bg-amber-500/10 rounded-full">
                  <UploadCloud className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {isDragActive ? "Drop it here" : "Click or drag your CV here"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or DOC — max 5MB</p>
                </div>
              </>
            )}

            {(state === "uploading" || state === "parsing") && (
              <>
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-white font-medium">
                  {state === "uploading" ? "Uploading…" : "Analysing with AI…"}
                </p>
              </>
            )}

            {state === "success" && (
              <>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-white font-medium">CV parsed! Redirecting…</p>
              </>
            )}

            {state === "failed" && (
              <div className="space-y-3 max-w-sm">
                <div className="p-3 bg-red-500/10 rounded-full mx-auto w-fit">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-white font-medium">Parse failed</p>
                <p className="text-sm text-red-400">{parseError}</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => { setState("idle"); setParseError(null); setCurrentCvId(null); }}
                    className="px-4 py-2 bg-[#2d2a26] hover:bg-[#3a3632] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  {currentCvId && (
                    <button
                      onClick={() => {
                        setState("parsing");
                        setParseError(null);
                        fetch("/api/cv/parse", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ cvId: currentCvId }),
                        }).catch(() => null);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-900 rounded-lg text-sm font-medium transition-colors"
                    >
                      Retry Parse
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Skip */}
        <div className="text-center mt-6">
          <Link
            href="/dashboard"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1"
          >
            Skip for now — I&apos;ll add my CV later
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
