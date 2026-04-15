"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Intentional: needed to avoid hydration mismatch with next-themes (SSR theme unknown)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="flex items-center px-3 py-2">
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
        className="relative flex items-center rounded-full p-0.5 transition-colors duration-300"
        style={{
          background: isDark ? "#1E3A5F" : "#CBD5E1",
          width: "56px",
          height: "28px",
        }}
      >
        {/* Sliding pill */}
        <span
          className="absolute flex items-center justify-center rounded-full shadow-sm transition-all duration-300"
          style={{
            width: "22px",
            height: "22px",
            background: isDark ? "#2563EB" : "#ffffff",
            left: isDark ? "3px" : "31px",
          }}
        >
          {isDark ? (
            <Moon className="h-3 w-3 text-white" />
          ) : (
            <Sun className="h-3 w-3 text-yellow-500" />
          )}
        </span>
        {/* Background icons */}
        <span className="flex w-full items-center justify-between px-1.5">
          <Moon
            className="h-3 w-3 transition-opacity duration-300"
            style={{ color: isDark ? "transparent" : "#94A3B8", opacity: isDark ? 0 : 1 }}
          />
          <Sun
            className="h-3 w-3 transition-opacity duration-300"
            style={{ color: isDark ? "#94A3B8" : "transparent", opacity: isDark ? 1 : 0 }}
          />
        </span>
      </button>
    </div>
  );
}
