"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    d3?: unknown;
    initCourseworkMap?: () => void;
  }
}

const D3_SCRIPT_ID = "coursework-d3-script";
const MAP_SCRIPT_ID = "coursework-map-script";

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function showLoadFailure() {
  const target = document.querySelector<HTMLElement>('[data-viz="treemap"]');
  if (target && !target.querySelector("svg")) target.textContent = "Failed to load visualization.";
}

export function CourseworkAssets({ version }: { version: string }) {
  useEffect(() => {
    let cancelled = false;

    async function loadCoursework() {
      try {
        if (typeof window.d3 === "undefined") {
          await loadScript(D3_SCRIPT_ID, `/static/vendor/d3.v7.min.js?v=${version}`);
        }
        if (typeof window.initCourseworkMap !== "function") {
          await loadScript(MAP_SCRIPT_ID, `/static/coursework.js?v=${version}`);
        }
        if (!cancelled) window.initCourseworkMap?.();
      } catch (error) {
        console.error("Failed to load coursework map", error);
        if (!cancelled) showLoadFailure();
      }
    }

    loadCoursework();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return null;
}
