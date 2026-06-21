"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/month", label: "Month" },
  { href: "/plan", label: "Plan" },
  { href: "/finances", label: "Cash" },
  { href: "/year", label: "Year" },
];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-10 border-b border-lavender-200 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-5 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-xl">🪷</span>
          <span className="hidden font-semibold text-ink sm:inline">
            Family Budget
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-lavender-200 text-lavender-700"
                  : "text-ink-soft hover:bg-lavender-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="ml-0.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-faint hover:bg-lavender-100"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
