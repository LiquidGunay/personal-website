"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function resolvedTheme(): Theme {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.dataset.theme;
    if (attr === "light" || attr === "dark") return attr;
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function applyTheme(theme: Theme, persist: boolean) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  if (persist) {
    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // Cookie persistence is enough when local storage is unavailable.
    }
    document.cookie = `theme=${theme}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
  window.dispatchEvent(new CustomEvent("personal-site:theme-change", { detail: { theme } }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initial = resolvedTheme();
    setTheme(initial);
    applyTheme(initial, false);
  }, []);

  const setSelectedTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme, true);
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => setSelectedTheme("light")}
      >
        Light
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => setSelectedTheme("dark")}
      >
        Dark
      </button>
    </div>
  );
}
