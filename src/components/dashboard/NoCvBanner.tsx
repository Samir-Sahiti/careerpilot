import Link from "next/link";
import { UploadCloud, ArrowRight } from "lucide-react";

export function NoCvBanner() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl flex-wrap">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
          <UploadCloud className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Upload your CV to unlock all features</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Job analysis, interview prep, and career roadmaps all need your CV.
          </p>
        </div>
      </div>
      <Link
        href="/cv"
        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
      >
        Upload CV <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
