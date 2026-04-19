"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Copy, Check, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Application } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  applications: Application[];
}

interface AppState {
  loading: boolean;
  draft: string | null;
  sent: boolean;
  expanded: boolean;
}

export function FollowUpWidget({ applications: initialApps }: Props) {
  const [apps, setApps] = useState<Application[]>(initialApps);
  const [states, setStates] = useState<Record<string, AppState>>(() =>
    Object.fromEntries(
      initialApps.map((a) => [
        a.id,
        { loading: false, draft: a.follow_up_draft ?? null, sent: !!a.follow_up_sent_at, expanded: false },
      ])
    )
  );
  const [copied, setCopied] = useState<string | null>(null);

  const setState = (id: string, patch: Partial<AppState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const generateDraft = async (app: Application) => {
    setState(app.id, { loading: true });
    try {
      const res = await fetch("/api/applications/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setState(app.id, { draft: data.draft, expanded: true, loading: false });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate draft");
      setState(app.id, { loading: false });
    }
  };

  const copyDraft = async (id: string, draft: string) => {
    await navigator.clipboard.writeText(draft);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  const markSent = async (id: string) => {
    const res = await fetch("/api/applications/follow-up", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: id }),
    });
    if (!res.ok) { toast.error("Failed to mark as sent"); return; }
    setState(id, { sent: true });
    setApps((prev) => prev.filter((a) => a.id !== id));
    toast.success("Marked as sent — we won't remind you again.");
  };

  const visibleApps = apps.filter((a) => !states[a.id]?.sent);
  if (visibleApps.length === 0) return null;

  return (
    <div className="bg-[#111827] border border-amber-500/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1E3A5F]">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Mail className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            {visibleApps.length} application{visibleApps.length !== 1 ? "s" : ""} may need a follow-up
          </p>
          <p className="text-xs text-gray-400">10+ days since applying with no status change</p>
        </div>
      </div>

      <div className="divide-y divide-[#1E3A5F]">
        {visibleApps.map((app) => {
          const s = states[app.id];
          if (!s) return null;
          return (
            <div key={app.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-white">{app.job_title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {app.company && `${app.company} · `}
                    Applied {app.applied_at ? formatDistanceToNow(new Date(app.applied_at), { addSuffix: true }) : "recently"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.draft && (
                    <button
                      onClick={() => setState(app.id, { expanded: !s.expanded })}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      {s.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {s.expanded ? "Hide" : "Show"} draft
                    </button>
                  )}
                  <button
                    onClick={() => generateDraft(app)}
                    disabled={s.loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {s.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    {s.draft ? "Regenerate" : "Draft follow-up"}
                  </button>
                </div>
              </div>

              {s.draft && s.expanded && (
                <div className="space-y-2">
                  <div className="bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg p-3">
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{s.draft}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyDraft(app.id, s.draft!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#2A4B75] text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      {copied === app.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </button>
                    <button
                      onClick={() => markSent(app.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      I sent it
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
