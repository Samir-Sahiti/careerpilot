"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { ApplicationStatus, OutcomeStage } from "@/types";
import { OUTCOME_STAGES } from "@/lib/validation/schemas";

const STAGE_LABELS: Record<OutcomeStage, string> = {
  no_response: "No response",
  recruiter_screen: "Recruiter screen",
  phone_screen: "Phone / video screen",
  technical: "Technical interview",
  onsite: "Onsite / final round",
  offer: "Reached offer stage",
};

interface OutcomeModalProps {
  status: ApplicationStatus;
  onSubmit: (outcome: { stage: OutcomeStage | null; reason: string }) => void;
  onSkip: () => void;
}

export function OutcomeModal({ status, onSubmit, onSkip }: OutcomeModalProps) {
  const [stage, setStage] = useState<OutcomeStage | "">("");
  const [reason, setReason] = useState("");

  const title =
    status === "interviewing"
      ? "How did it go so far?"
      : status === "offered"
      ? "Congrats on the offer! Any notes?"
      : "What happened?";

  const stagePlaceholder =
    status === "interviewing"
      ? "What stage are you at?"
      : "What was the furthest stage you reached?";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ stage: stage || null, reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111827] border border-[#1E3A5F] rounded-2xl shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between p-5 border-b border-[#1E3A5F]">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Stage reached
            </label>
            <div className="relative">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as OutcomeStage | "")}
                className="w-full appearance-none bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors pr-8"
              >
                <option value="">{stagePlaceholder}</option>
                {OUTCOME_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Anything notable? <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Recruiter feedback, rejection reason, what went well…"
              className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 px-4 py-2.5 bg-[#0A0F1C] border border-[#1E3A5F] text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
