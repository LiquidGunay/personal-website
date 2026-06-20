import type { Metadata } from "next";
import "./globals.css";

import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "Gunay Soni",
  description: "Technical writing and research notes on uncertainty-aware machine learning systems.",
};

const themeInitScript = `(() => {
  try {
    const cookie = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
    const stored = window.localStorage.getItem("theme");
    const theme = cookie?.[1] || (stored === "light" || stored === "dark" ? stored : null);
    if (theme) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    }
  } catch {
    // Ignore storage failures and keep the CSS system preference fallback.
  }
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
