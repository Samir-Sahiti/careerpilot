import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0e0c] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center space-y-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-red-900/20 border border-red-500/30 rounded-3xl flex items-center justify-center shadow-lg shadow-red-900/20">
          <AlertCircle className="w-12 h-12 text-red-400" />
        </div>

        <h1 className="text-5xl font-extrabold text-white tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          404 - Page Not Found
        </h1>

        <p className="text-gray-400 text-lg max-w-md mx-auto">
          We couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-medium rounded-xl transition-all shadow-lg shadow-amber-900/20 inline-flex items-center gap-2"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
