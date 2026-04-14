"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CVParsingStatusProps {
  cvId: string;
  initialStatus: string;
  initialError: string | null;
}

export function CVParsingStatus({ cvId, initialStatus, initialError }: CVParsingStatusProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [parseError, setParseError] = useState(initialError);
  const [isRetrying, setIsRetrying] = useState(false);
  const supabase = createClient();

  const poll = useCallback(() => {
    const startTime = Date.now();

    const check = async () => {
      if (Date.now() - startTime > 120_000) {
        setStatus("failed");
        setParseError("Parsing timed out after 2 minutes. Please try again.");
        return;
      }

      const { data, error } = await supabase
        .from("cvs")
        .select("parse_status, parse_error")
        .eq("id", cvId)
        .single();

      if (!error && data) {
        setStatus(data.parse_status);
        if (data.parse_status === "success") {
          router.refresh();
          return;
        }
        if (data.parse_status === "failed") {
          setParseError(data.parse_error || "An unknown error occurred during parsing.");
          return;
        }
      }

      // Still pending — check again in 5s
      setTimeout(check, 5000);
    };

    check();
  }, [cvId, router, supabase]);

  useEffect(() => {
    if (initialStatus === "pending") {
      poll();
    }
  }, [initialStatus, poll]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setStatus("pending");
    setParseError(null);

    try {
      const res = await fetch("/api/cv/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Retry failed");
      }

      poll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to retry parsing");
      setStatus("failed");
    } finally {
      setIsRetrying(false);
    }
  };

  // ── Failed state ──────────────────────────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center max-w-md mx-auto animate-fade-in-up">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full">
          <X className="w-10 h-10 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2
            className="text-xl font-semibold text-white"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            CV Parsing Failed
          </h2>
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 leading-relaxed">
            {parseError || "An error occurred while processing your CV."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/cv")}
            className="px-5 py-2.5 bg-[#1E3A5F] hover:bg-[#2A4B75] text-white rounded-lg text-sm font-medium transition-colors border border-[#1E3A5F]"
          >
            Upload a Different File
          </button>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isRetrying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isRetrying ? "Retrying..." : "Retry Parse"}
          </button>
        </div>
      </div>
    );
  }

  // ── Pending / processing state ────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 animate-fade-in-up">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <h2
        className="text-xl font-semibold text-white"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        AI is processing your CV...
      </h2>
      <p className="text-gray-400 text-sm">
        This usually takes under a minute. Hang tight.
      </p>
    </div>
  );
}
