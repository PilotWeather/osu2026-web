"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4.5">
      <circle cx="12" cy="12" r="3.5" />
      <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.28 5.28 3.86 3.86M20.14 20.14l-1.42-1.42M18.72 5.28l1.42-1.42M3.86 20.14l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 15.1A8.5 8.5 0 0 1 8.9 3.5a8.5 8.5 0 1 0 11.6 11.6Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Açık temaya geç" : "Koyu temaya geç";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition-colors duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-blue-500/60 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-950"
    >
      <span className={`absolute transition-all duration-200 ${isDark ? "-rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"}`}>
        <SunIcon />
      </span>
      <span className={`absolute transition-all duration-200 ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-75 opacity-0"}`}>
        <MoonIcon />
      </span>
    </button>
  );
}
