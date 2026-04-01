import Link from "next/link";
import { FileText, ArrowRight, Upload } from "lucide-react";
import { Cv } from "@/types";
import { format } from "date-fns";

interface CVStatusWidgetProps {
  cv: Cv | null;
}

export function CVStatusWidget({ cv }: CVStatusWidgetProps) {
  return (
    <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Your CV / Resume
          </h2>
        </div>
        <Link
          href="/cv"
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      {cv ? (
        <div className="flex flex-col gap-3">
          {/* Status pill */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              File Uploaded
            </span>
          </div>

          {/* File info */}
          <div className="bg-[#0A0F1C] border border-[#1E3A5F]/60 rounded-lg p-3">
            <p className="text-white text-sm font-medium truncate" title={cv.file_name}>
              {cv.file_name}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              Uploaded {format(new Date(cv.uploaded_at), "MMM d, yyyy")}
            </p>
          </div>

          <Link
            href="/cv"
            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors mt-1"
          >
            View &amp; edit profile →
          </Link>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-start gap-4 py-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1E3A5F]/30">
            <Upload className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-gray-400 text-sm leading-relaxed">
              No Resume or CV uploaded yet — add yours to unlock all features.
            </p>
          </div>
          <Link
            href="/cv"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Upload your CV / Resume <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
