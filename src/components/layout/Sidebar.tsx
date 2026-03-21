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
  Settings
} from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";

const navLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "CV", href: "/cv", icon: FileText },
  { name: "Job Analyzer", href: "/jobs", icon: Briefcase },
  { name: "Interview Coach", href: "/interview", icon: MessageSquare },
  { name: "Career Ladder", href: "/career", icon: TrendingUp },
];

export function Sidebar({ userEmail, displayName }: { userEmail: string; displayName: string }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileOpen((prev) => !prev);
  };

  // Shared inner content for both desktop and mobile sidebar rendering
  const SidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      {/* Top: Logo & Nav */}
      <div>
        <div className="mb-8 px-2 flex items-center h-10">
          <Link
            href="/dashboard"
            className="text-xl font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-heading)", color: "#F1F5F9" }}
          >
            Career<span style={{ color: "#2563EB" }}>Pilot</span>
          </Link>
        </div>

        <nav className="space-y-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Settings Link at Bottom */}
      <div className="mt-auto pt-4 px-2">
        <Link
          href="/settings"
          onClick={() => setIsMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-blue-600/20 text-blue-400"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>

      {/* Bottom: User Info & Sign Out */}
      <div className="mt-4 border-t border-[#1E3A5F] pt-4">
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
        onClick={toggleMobileMenu}
        className="fixed top-4 left-4 z-40 p-2 rounded-md bg-[#111827] border border-[#1E3A5F] text-gray-300 hover:text-white lg:hidden"
        aria-label="Toggle Navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={toggleMobileMenu}
          />
          <div
            className="relative flex w-64 max-w-xs flex-1 flex-col shadow-xl"
            style={{ background: "#0D1117" }}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={toggleMobileMenu}
              >
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[240px] lg:flex-col"
        style={{
          background: "#0D1117",
          borderRight: "1px solid #1E3A5F",
        }}
      >
        {SidebarContent}
      </div>

      {/* Spacer for desktop layout (matches the width of the fixed sidebar) */}
      <div className="hidden lg:block lg:w-[240px] shrink-0" />
    </>
  );
}
