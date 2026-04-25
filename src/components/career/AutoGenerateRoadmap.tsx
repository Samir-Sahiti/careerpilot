"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Route } from "lucide-react";
import { toast } from "sonner";

export function AutoGenerateRoadmap() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function generate() {
      try {
        const res = await fetch("/api/career/roadmap", { method: "POST" });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to generate roadmap");
        }
        if (mounted) {
          toast.success("Career roadmap generated successfully");
          router.refresh();
        }
      } catch (err: unknown) {
        if (mounted) toast.error(err instanceof Error ? err.message : "An error occurred");
      }
    }

    generate();

    return () => { mounted = false; };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center animate-fade-in-up">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse" />
        <div className="w-20 h-20 bg-[#2d2a26] border border-amber-500/30 rounded-full flex items-center justify-center relative z-10">
          <Route className="w-10 h-10 text-amber-400" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Charting Your Course
        </h2>
        <p className="text-gray-400 max-w-sm mx-auto flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          Analyzing your CV experience to build viable progression tracks...
        </p>
      </div>
    </div>
  );
}
