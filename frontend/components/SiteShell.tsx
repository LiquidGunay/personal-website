import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/coursework", label: "Coursework" },
  { href: "/about", label: "About" },
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
        <nav aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="content" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <small>© {new Date().getFullYear()} Gunay Soni</small>
        <a href="/feed.xml">RSS</a>
      </footer>
    </div>
  );
}
