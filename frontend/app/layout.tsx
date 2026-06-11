import type { Metadata } from "next";
import "./globals.css";

import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "Gunay Soni",
  description: "Technical writing and research notes on uncertainty-aware machine learning systems.",
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
