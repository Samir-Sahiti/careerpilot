"use client";

import { Download } from "lucide-react";
import { exportToPdf } from "@/lib/exportToPdf";
import { InterviewSession } from "@/types";

interface ExportInterviewButtonProps {
  session: InterviewSession;
  jobTitle?: string;
}

export function ExportInterviewButton({ session, jobTitle }: ExportInterviewButtonProps) {
  function handleExport() {
    const scoreColor = (score: number | null) => {
      if (!score) return "#555";
      if (score >= 75) return "#16a34a";
      if (score >= 50) return "#d97706";
      return "#dc2626";
    };

    const questionsHtml = session.questions
      .map((q, i) => `
        <div class="feedback-block">
          <h3>Q${i + 1}: ${q.question_text}</h3>
          <p class="meta">${q.type}</p>
          ${q.user_answer ? `<p><span class="label">Your answer:</span> ${q.user_answer}</p>` : ""}
          ${q.feedback ? `<p><span class="label">Feedback:</span> ${q.feedback}</p>` : ""}
          ${q.score !== null ? `<p><span class="label">Score:</span> <span style="color:${scoreColor(q.score)}">${q.score}/100</span></p>` : ""}
        </div>
      `)
      .join("");

    const html = `
      <h1>${jobTitle || "Mock Interview"} — Results</h1>
      <p class="meta">Completed ${new Date(session.created_at).toLocaleDateString()}</p>
      ${session.overall_score !== null ? `<p class="score">Overall Score: ${session.overall_score}/100</p>` : ""}
      <div class="divider"></div>
      <h2>Question Breakdown</h2>
      ${questionsHtml}
    `;

    exportToPdf(`Interview Results — ${jobTitle || "Mock Interview"}`, html);
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
    >
      <Download className="h-4 w-4" />
      Export PDF
    </button>
  );
}
