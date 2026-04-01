"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  ClipboardList, Plus, X, ExternalLink, Briefcase,
  Building2, Calendar, FileEdit, Check, Loader2, Trash2, Link2
} from "lucide-react";
import { Application, ApplicationStatus } from "@/types";

const STATUSES: { value: ApplicationStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: "saved",        label: "Saved",        color: "text-gray-400",   bg: "bg-gray-500/10",   border: "border-gray-500/20" },
  { value: "applied",      label: "Applied",      color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
  { value: "interviewing", label: "Interviewing", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  { value: "offered",      label: "Offered",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20" },
  { value: "rejected",     label: "Rejected",     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20" },
];

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const s = STATUSES.find((x) => x.value === status)!;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.color} ${s.bg} ${s.border}`}>
      {s.label}
    </span>
  );
}

interface Props {
  initialApplications: Application[];
}

export function ApplicationsClient({ initialApplications }: Props) {
  const [apps, setApps] = useState<Application[]>(initialApplications);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | "all">("all");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  // Add form state
  const [addTitle, setAddTitle] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addStatus, setAddStatus] = useState<ApplicationStatus>("saved");
  const [addNotes, setAddNotes] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = activeTab === "all" ? apps : apps.filter((a) => a.status === activeTab);

  // ── API helpers ───────────────────────────────────────────────────────────
  const patchApp = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Update failed");
    return res.json() as Promise<Application>;
  }, []);

  const handleStatusChange = async (app: Application, status: ApplicationStatus) => {
    const updated = await patchApp(app.id, { status }).catch(() => null);
    if (!updated) { toast.error("Failed to update status"); return; }
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    if (selectedApp?.id === app.id) setSelectedApp((p) => p && { ...p, status });
  };

  const handleNotesChange = (app: Application, notes: string) => {
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, notes } : a)));
    if (selectedApp?.id === app.id) setSelectedApp((p) => p && { ...p, notes });

    if (noteTimers.current[app.id]) clearTimeout(noteTimers.current[app.id]);
    noteTimers.current[app.id] = setTimeout(async () => {
      setSavingNotes(app.id);
      await patchApp(app.id, { notes }).catch(() => toast.error("Failed to save notes"));
      setSavingNotes(null);
    }, 1000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setApps((prev) => prev.filter((a) => a.id !== id));
    if (selectedApp?.id === id) setSelectedApp(null);
    toast.success("Application deleted");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: addTitle.trim(),
          company: addCompany.trim() || undefined,
          job_url: addUrl.trim() || undefined,
          status: addStatus,
          notes: addNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApps((prev) => [data, ...prev]);
      setShowAdd(false);
      setAddTitle(""); setAddCompany(""); setAddUrl(""); setAddStatus("saved"); setAddNotes("");
      toast.success("Application added!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add application");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Application Tracker
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {apps.length} application{apps.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white">New Application</h2>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Job Title *</label>
                <input required value={addTitle} onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Company</label>
                <input value={addCompany} onChange={(e) => setAddCompany(e.target.value)}
                  placeholder="e.g. Stripe"
                  className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Job URL</label>
                <input type="url" value={addUrl} onChange={(e) => setAddUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Status</label>
                <select value={addStatus} onChange={(e) => setAddStatus(e.target.value as ApplicationStatus)}
                  className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors">
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400">Notes</label>
              <textarea rows={3} value={addNotes} onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Recruiter name, interview date, anything useful…"
                className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
            </div>
            <button type="submit" disabled={addLoading || !addTitle.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm">
              {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {addLoading ? "Adding…" : "Add Application"}
            </button>
          </form>
        </div>
      )}

      {/* Status tabs */}
      {apps.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {[{ value: "all" as const, label: `All (${apps.length})` }, ...STATUSES.map((s) => ({
            value: s.value,
            label: `${s.label} (${apps.filter((a) => a.status === s.value).length})`
          }))].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                activeTab === tab.value
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-[#111827] border-[#1E3A5F] text-gray-400 hover:text-white hover:border-blue-500/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main content: list + detail panel */}
      {apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border-2 border-dashed border-[#1E3A5F] rounded-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F]/30 flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-gray-500" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-lg font-semibold text-white">No applications yet</h2>
            <p className="text-gray-400 text-sm">
              Analyse a job listing and add it here to keep track of where you&apos;ve applied.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Analyse a job listing
          </Link>
        </div>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Application list */}
          <div className={`flex-1 min-w-0 space-y-3 ${selectedApp ? "hidden lg:block" : ""}`}>
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">No applications with this status.</p>
            ) : (
              filtered.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedApp?.id === app.id
                      ? "bg-blue-600/10 border-blue-500/40"
                      : "bg-[#111827] border-[#1E3A5F] hover:border-blue-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-white text-sm font-semibold truncate">{app.job_title}</p>
                      {app.company && (
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {app.company}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(app.created_at), "MMM d, yyyy")}
                    </span>
                    {app.job_analysis_id && (
                      <span className="flex items-center gap-1 text-blue-500/60">
                        <Briefcase className="w-3 h-3" /> Analysis linked
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          {selectedApp && (
            <div className="w-full lg:w-96 shrink-0 bg-[#111827] border border-[#1E3A5F] rounded-xl overflow-hidden animate-fade-in-up">
              {/* Panel header */}
              <div className="flex items-center justify-between p-4 border-b border-[#1E3A5F]">
                <h3 className="text-sm font-bold text-white truncate pr-2">{selectedApp.job_title}</h3>
                <button onClick={() => setSelectedApp(null)} className="text-gray-500 hover:text-white shrink-0 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Company + URL */}
                {selectedApp.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                    {selectedApp.company}
                  </div>
                )}
                {selectedApp.job_url && (
                  <a href={selectedApp.job_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors truncate">
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    {selectedApp.job_url}
                  </a>
                )}

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    value={selectedApp.status}
                    onChange={(e) => handleStatusChange(selectedApp, e.target.value as ApplicationStatus)}
                    className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</label>
                    {savingNotes === selectedApp.id && (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={selectedApp.notes || ""}
                    onChange={(e) => handleNotesChange(selectedApp, e.target.value)}
                    placeholder="Interview notes, recruiter name, key dates…"
                    className="w-full bg-[#0A0F1C] border border-[#1E3A5F] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Links */}
                <div className="flex flex-col gap-2 pt-1">
                  {selectedApp.job_analysis_id && (
                    <Link
                      href={`/jobs/${selectedApp.job_analysis_id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-[#0A0F1C] border border-[#1E3A5F] hover:border-blue-500/40 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                      View Job Analysis
                    </Link>
                  )}
                  {selectedApp.cover_letter_id && (
                    <Link
                      href="/cover-letter"
                      className="flex items-center gap-2 px-3 py-2 bg-[#0A0F1C] border border-[#1E3A5F] hover:border-blue-500/40 text-gray-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-purple-400" />
                      View Cover Letter
                    </Link>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(selectedApp.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors mt-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Application
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
