"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  MessageSquare,
  TrendingUp,
  Menu,
  X,
  Settings,
  FileEdit,
  ClipboardList,
  BarChart2,
  ChevronDown,
} from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";

const primaryLinks = [
  { name: "Dashboard",       href: "/dashboard",   icon: LayoutDashboard },
  { name: "Job Analyzer",    href: "/jobs",         icon: Briefcase       },
  { name: "Applications",    href: "/applications", icon: ClipboardList   },
  { name: "Interview Coach", href: "/interview",    icon: MessageSquare   },
];

const secondaryLinks = [
  { name: "CV Hub",          href: "/cv",           icon: FileText        },
  { name: "Career Ladder",   href: "/career",       icon: TrendingUp      },
  { name: "Cover Letter",    href: "/cover-letter", icon: FileEdit        },
  { name: "Analytics",       href: "/analytics",    icon: BarChart2       },
];

export function Sidebar({ userEmail, displayName }: { userEmail: string; displayName: string }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const isSecondaryActive = secondaryLinks.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + "/")
  );

  const NavLink = ({ href, icon: Icon, name }: { href: string; icon: typeof Briefcase; name: string }) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={() => setIsMobileOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-amber-500/15 text-amber-400"
            : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {name}
      </Link>
    );
  };

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <div className="mb-8 px-2 flex items-center h-10">
          <Link
            href="/dashboard"
            className="text-xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}
          >
            Career<span style={{ color: "#f59e0b" }}>OS</span>
          </Link>
        </div>

        <nav className="space-y-1">
          {primaryLinks.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          {/* Tools group */}
          <div className="pt-2">
            <button
              onClick={() => setToolsExpanded((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                isSecondaryActive && !toolsExpanded
                  ? "text-amber-400"
                  : "text-stone-600 hover:text-stone-400"
              }`}
            >
              <span>Tools</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsExpanded || isSecondaryActive ? "rotate-180" : ""}`} />
            </button>

            {(toolsExpanded || isSecondaryActive) && (
              <div className="mt-1 space-y-1 pl-1">
                {secondaryLinks.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="mt-auto pt-4 px-2">
        <Link
          href="/settings"
          onClick={() => setIsMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-amber-500/15 text-amber-400"
              : "text-stone-400 hover:bg-white/5 hover:text-stone-100"
          }`}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>

      <div className="mt-4 border-t border-[#232220] pt-4">
        <div className="mb-2 px-3 flex flex-col gap-0.5 pointer-events-none">
          <span className="text-sm font-bold text-gray-200 truncate" title={displayName}>
            {displayName}
          </span>
          <span className="text-xs font-medium text-gray-500 truncate" title={userEmail}>
            {userEmail}
          </span>
        </div>
        <SignOutButton />
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen((v) => !v)}
        className="fixed top-4 left-4 z-40 p-2 rounded-md bg-[#1a1916] border border-[#2d2a26] text-gray-300 hover:text-white lg:hidden"
        aria-label="Toggle Navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex w-64 max-w-xs flex-1 flex-col shadow-xl" style={{ background: "#0c0b0a" }}>
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Desktop */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[240px] lg:flex-col"
        style={{ background: "#0c0b0a", borderRight: "1px solid #232220" }}
      >
        {SidebarContent}
      </div>

      {/* Spacer */}
      <div className="hidden lg:block lg:w-[240px] shrink-0" />
    </>
  );
}
