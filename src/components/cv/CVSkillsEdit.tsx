"use client";

import { useState } from "react";
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
  const supabase = createClient();

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    
    const skillToAdd = newSkill.trim();
    if (skills.includes(skillToAdd)) {
      setNewSkill("");
      return;
    }

    const updatedSkills = [...skills, skillToAdd];
    setSkills(updatedSkills);
    setNewSkill("");

    const updatedData = { ...parsedData, skills: updatedSkills };

    const { error } = await supabase
      .from("cvs")
      .update({ parsed_data: updatedData })
      .eq("id", cvId);

    if (error) {
      toast.error("Failed to add skill");
      // Revert optimistic update
      setSkills(skills);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    const updatedSkills = skills.filter(s => s !== skillToRemove);
    setSkills(updatedSkills);

    const updatedData = { ...parsedData, skills: updatedSkills };

    const { error } = await supabase
      .from("cvs")
      .update({ parsed_data: updatedData })
      .eq("id", cvId);

    if (error) {
      toast.error("Failed to remove skill");
      // Revert optimistic update
      setSkills(skills);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span 
            key={skill} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600/10 text-blue-400 border border-blue-500/20"
          >
            {skill}
            <button 
              onClick={() => handleRemoveSkill(skill)}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${skill}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
      </div>
      
      <form onSubmit={handleAddSkill} className="flex items-center gap-2 max-w-sm">
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          placeholder="Add a skill..."
          className="flex-1 bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button 
          type="submit"
          disabled={!newSkill.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
    </div>
  );
}
