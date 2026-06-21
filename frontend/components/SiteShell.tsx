import Link from "next/link";
import type { ReactNode } from "react";

import { PrimaryNav } from "@/components/PrimaryNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/" className="site-brand">
          Gunay Soni
        </Link>
        <div className="site-header__actions">
          <PrimaryNav />
          <ThemeToggle />
        </div>
      </header>
      <main id="content" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <small>© {new Date().getFullYear()} Gunay Soni</small>
        <Link href="/coursework">Coursework</Link>
      </footer>
    </div>
  );
}
