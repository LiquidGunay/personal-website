import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/coursework", label: "Coursework" },
];

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
          <nav aria-label="Primary">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
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
