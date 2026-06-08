import type { Metadata } from "next";
import "./globals.css";

import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "Gunay Soni",
  description: "Minimalist technical blog and persona site.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
