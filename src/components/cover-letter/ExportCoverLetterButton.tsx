"use client";

import { Download } from "lucide-react";
import { exportToPdf } from "@/lib/exportToPdf";

interface ExportCoverLetterButtonProps {
  jobTitle: string;
  company?: string | null;
  content: string;
}

export function ExportCoverLetterButton({ jobTitle, company, content }: ExportCoverLetterButtonProps) {
  function handleExport() {
    const paragraphs = content
      .split("\n\n")
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n");

    const html = `
      <h1>${jobTitle}${company ? ` — ${company}` : ""}</h1>
      <p class="meta">Cover Letter</p>
      <div class="divider"></div>
      ${paragraphs}
    `;

    exportToPdf(`Cover Letter — ${jobTitle}`, html);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-2 bg-[#1E3A5F]/40 hover:bg-[#1E3A5F] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-[#1E3A5F]"
      title="Export as PDF"
    >
      <Download className="w-3.5 h-3.5" />
      PDF
    </button>
  );
}
