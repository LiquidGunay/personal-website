"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/coursework", label: "Coursework" },
];

function normalizePath(value: string) {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed || "/";
}

export function PrimaryNav() {
  const pathname = normalizePath(usePathname() || "/");

  return (
    <nav aria-label="Primary">
      {navItems.map((item) => {
        const href = normalizePath(item.href);
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
