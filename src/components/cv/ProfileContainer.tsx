"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Upload, Briefcase, GraduationCap, Flame, ArrowUpRight } from "lucide-react";
import { ParsedCvData, Cv } from "@/types";
import { CVSkillsEdit } from "@/components/cv/CVSkillsEdit";
import { CVUpload } from "@/components/cv/CVUpload";

interface ProfileContainerProps {
  cv: Cv;
}

export function ProfileContainer({ cv }: ProfileContainerProps) {
  const [isReuploading, setIsReuploading] = useState(false);
  const data = cv.parsed_data as ParsedCvData;
  const updatedAt = new Date(cv.uploaded_at);

  if (isReuploading) {
    return (
      <div className="pt-4">
        <CVUpload onCancel={() => setIsReuploading(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-heading)" }}>
            Your Profile
          </h1>
          <p className="text-gray-400 text-sm">
            Last updated: {format(updatedAt, "MMMM do, yyyy")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to delete your profile? This action will permanently remove your skills and analysis results.")) {
                try {
                  const res = await fetch(`/api/cv/${cv.id}`, {
                    method: "DELETE",
                  });
                  if (res.ok) {
                    window.location.reload();
                  } else {
                    const data = await res.json();
                    alert(data.error || "Failed to delete CV profile");
                  }
                } catch (err) {
                  console.error("Deletion error:", err);
                  alert("An unexpected error occurred during deletion.");
                }
              }
            }}
            className="bg-[#0A0F1C] border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            Delete Profile
          </button>
          <button
            onClick={() => setIsReuploading(true)}
            className="bg-[#111827] border border-[#1E3A5F] text-white hover:bg-[#1E3A5F]/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Re-upload CV / Resume
          </button>
        </div>
      </div>

      {/* ── Header Card (Role, Seniority, Exp) ─────────────────────────────────── */}
      <div className="bg-[#0A0F1C] border border-[#1E3A5F] rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-12 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex-1 space-y-2 relative z-10">
          <div className="text-blue-400 font-semibold tracking-wider text-xs uppercase mb-1">
            Current Role
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {data.current_role}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-8 relative z-10 flex-shrink-0">
          <div>
            <div className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-2">
              Level
            </div>
            <div className="flex items-center gap-2 text-white font-semibold">
              <Flame className="w-5 h-5 text-orange-400" />
              {data.seniority_level}
            </div>
          </div>
          <div>
            <div className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-2">
              Experience
            </div>
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="text-lg leading-none">{data.years_of_experience}</span>
              <span className="text-gray-400 text-sm">years</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* ── Experience ────────────────────────────────────────────────────────── */}
          <section className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-white pb-4 border-b border-[#1E3A5F]">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Work History</h3>
            </div>
            
            <div className="space-y-6">
              {data.experience.map((exp, i) => (
                <div key={i} className="relative pl-6 before:absolute before:left-1.5 before:top-2 before:bottom-0 before:w-[1px] before:bg-[#1E3A5F] last:before:hidden py-1">
                  <div className="absolute left-0 top-2 w-3 h-3 bg-[#0A0F1C] border-2 border-blue-500 rounded-full" />
                  <div className="mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h4 className="text-white font-semibold">{exp.title}</h4>
                    <span className="text-blue-400 text-sm font-medium">{exp.duration}</span>
                  </div>
                  <div className="text-gray-400 font-medium mb-3">{exp.company}</div>
                  <p className="text-gray-500 text-sm leading-relaxed">{exp.summary}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Education ─────────────────────────────────────────────────────────── */}
          <section className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-white pb-4 border-b border-[#1E3A5F]">
              <GraduationCap className="w-5 h-5 text-purple-500" />
              <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Education</h3>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {data.education.map((edu, i) => (
                <div key={i} className="bg-[#0A0F1C] border border-[#1E3A5F]/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-1 line-clamp-2" title={edu.degree}>{edu.degree}</h4>
                  <div className="text-gray-400 text-sm mb-2">{edu.institution}</div>
                  {edu.year && <div className="text-gray-500 font-medium text-sm">{edu.year}</div>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8 lg:col-span-1">
          {/* ── Skills (Editable) ─────────────────────────────────────────────────── */}
          <section className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-white pb-4 border-b border-[#1E3A5F]">
              <ArrowUpRight className="w-5 h-5 text-green-500" />
              <h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Skills Matrix</h3>
            </div>
            
            <CVSkillsEdit cvId={cv.id} parsedData={data} />
            <p className="text-xs text-gray-500 pt-2 border-t border-[#1E3A5F]/50">
              Add any skills the AI might have missed. These will be used for your job analysis matching.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
