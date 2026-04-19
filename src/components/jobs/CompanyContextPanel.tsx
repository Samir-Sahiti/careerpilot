"use client";

import { useState } from "react";
import { Building2, Loader2, Star, AlertTriangle, TrendingUp, Users, Info, ChevronDown, ChevronUp } from "lucide-react";

interface CompanyContext {
  overview: string;
  size: string;
  funding_stage: string;
  glassdoor_rating: number | null;
  recent_notable: string;
  layoff_signals: string;
  disclaimer: string;
}

interface Props {
  company: string;
}

export function CompanyContextPanel({ company }: Props) {
  const [context, setContext] = useState<CompanyContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded && !error) { setCollapsed((v) => !v); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/company-context?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setContext(data);
      setLoaded(true);
      setCollapsed(false);
    } catch {
      setError("Couldn't fetch company context.");
    } finally {
      setLoading(false);
    }
  };

  const hasLayoffSignal = context?.layoff_signals && !context.layoff_signals.includes("No known");

  return (
    <div className="bg-[#111827] border border-[#1E3A5F] rounded-xl overflow-hidden">
      <button
        onClick={load}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1E3A5F]/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Company Context — {company}</p>
            <p className="text-xs text-gray-400">Funding stage, size, recent news, Glassdoor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {loaded && !error && (collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />)}
          {!loaded && !loading && <span className="text-xs text-blue-400 font-medium">Load context</span>}
        </div>
      </button>

      {error && (
        <div className="px-4 pb-4">
          <p className="text-sm text-red-400">{error}</p>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(company + " company info glassdoor")} `}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-1 inline-block"
          >
            Search manually
          </a>
        </div>
      )}

      {context && !collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#1E3A5F] pt-4">
          {/* Overview */}
          <p className="text-sm text-gray-300 leading-relaxed">{context.overview}</p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#0A0F1C] rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="w-3 h-3" /> Size
              </div>
              <p className="text-sm font-medium text-white">{context.size}</p>
            </div>
            <div className="bg-[#0A0F1C] rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <TrendingUp className="w-3 h-3" /> Stage
              </div>
              <p className="text-sm font-medium text-white">{context.funding_stage}</p>
            </div>
            {context.glassdoor_rating !== null && (
              <div className="bg-[#0A0F1C] rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Star className="w-3 h-3" /> Glassdoor
                </div>
                <p className="text-sm font-medium text-white">{context.glassdoor_rating}/5</p>
              </div>
            )}
          </div>

          {/* Recent notable */}
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">{context.recent_notable}</p>
          </div>

          {/* Layoff signals */}
          {hasLayoffSignal && (
            <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{context.layoff_signals}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-gray-600 italic border-t border-[#1E3A5F] pt-3">{context.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
