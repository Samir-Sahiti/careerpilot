"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ParsedCvData } from "@/types";

interface CVSkillsEditProps {
  cvId: string;
  parsedData: ParsedCvData;
}

export function CVSkillsEdit({ cvId, parsedData }: CVSkillsEditProps) {
  const [skills, setSkills] = useState<string[]>(parsedData.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  // Sync state if parsedData changes from parent
  useEffect(() => {
    if (parsedData.skills) {
      setSkills(parsedData.skills);
    }
  }, [parsedData.skills]);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const skillToAdd = newSkill.trim();
    if (!skillToAdd || isSubmitting) return;
    
    if (skills.includes(skillToAdd)) {
      setNewSkill("");
      toast.info(`"${skillToAdd}" is already in your skills.`);
      return;
    }

    setIsSubmitting(true);
    const updatedSkills = [...skills, skillToAdd];
    const updatedData = { ...parsedData, skills: updatedSkills };

    try {
      // Optimistic update
      setSkills(updatedSkills);
      setNewSkill("");

      const { error } = await supabase
        .from("cvs")
        .update({ parsed_data: updatedData })
        .eq("id", cvId);

      if (error) throw error;
      toast.success("Skill added");
    } catch (error) {
      console.error("Add skill error:", error);
      toast.error("Failed to save skill changes");
      // Revert on failure
      setSkills(skills);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    if (isSubmitting) return;

    const updatedSkills = skills.filter(s => s !== skillToRemove);
    const updatedData = { ...parsedData, skills: updatedSkills };

    setIsSubmitting(true);
    try {
      setSkills(updatedSkills);

      const { error } = await supabase
        .from("cvs")
        .update({ parsed_data: updatedData })
        .eq("id", cvId);

      if (error) throw error;
    } catch (error) {
      console.error("Remove skill error:", error);
      toast.error("Failed to remove skill");
      setSkills(skills);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span 
            key={skill} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-full"
          >
            <span className="truncate">{skill}</span>
            <button 
              onClick={() => handleRemoveSkill(skill)}
              disabled={isSubmitting}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-full p-0.5 transition-colors flex-shrink-0"
              aria-label={`Remove ${skill}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      
      <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          disabled={isSubmitting}
          placeholder="Add a skill..."
          className="flex-1 bg-[#0f0e0c] border border-[#2d2a26] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-w-0"
        />
        <button 
          type="submit"
          disabled={isSubmitting || !newSkill.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-900 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shrink-0"
        >
          {isSubmitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>Add Skill</span>
        </button>
      </form>
    </div>
  );
}
