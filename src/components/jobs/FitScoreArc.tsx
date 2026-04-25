import React from "react";

interface FitScoreArcProps {
  score: number;
}

export function FitScoreArc({ score }: FitScoreArcProps) {
  // Determine color based on score
  let colorClass = "text-green-500";
  let strokeClass = "stroke-green-500";
  let bgClass = "bg-green-500/10";
  
  if (score < 41) {
    colorClass = "text-red-500";
    strokeClass = "stroke-red-500";
    bgClass = "bg-red-500/10";
  } else if (score < 70) {
    colorClass = "text-yellow-500";
    strokeClass = "stroke-yellow-500";
    bgClass = "bg-yellow-500/10";
  }

  // SVG parameters
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  // Dash offset representing the percentage
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center w-32 h-32 rounded-full ${bgClass} border border-[#2d2a26]/40 shrink-0`}>
      <svg
        className="transform -rotate-90 w-28 h-28"
        viewBox="0 0 100 100"
      >
        {/* Background track */}
        <circle
          className="stroke-[#2d2a26]/50"
          strokeWidth="8"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        {/* Progress arc */}
        <circle
          className={`${strokeClass} transition-all duration-1000 ease-out`}
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
          }}
        />
      </svg>
      {/* Centered score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-3xl font-extrabold ${colorClass}`} style={{ fontFamily: "var(--font-heading)" }}>
          {score}
        </span>
        <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase mt-0.5">
          Match
        </span>
      </div>
    </div>
  );
}
