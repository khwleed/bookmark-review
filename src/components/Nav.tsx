"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Review" },
  { href: "/sections", label: "Sections" },
  { href: "/archive", label: "Archive & skipped" },
  { href: "/import", label: "Import" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 px-4 sm:px-6 h-14 border-b border-[var(--line)] bg-[var(--card)]">
      <span className="font-semibold mr-4">🔖 Bookmark Review</span>
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm ${active ? "bg-[var(--muted)] font-medium" : "text-[var(--dim)] hover:text-[var(--fg)]"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
