"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-6">
      <h2 className="text-2xl border-b border-red-500/30 pb-2 font-semibold text-red-500">
        Something went wrong.
      </h2>
      <p className="max-w-md text-gray-400">
        We encountered an error loading this dashboard feature. Please try again or contact support if the issue persists.
      </p>
      <button
        className="px-6 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg font-medium text-stone-900 shadow-lg transition-colors"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
