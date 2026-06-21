"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const onPlan = pathname.startsWith("/plan");

  return (
    <header className="sticky top-0 z-10 border-b border-lavender-200 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🪷</span>
          <span className="font-semibold text-ink">Family Budget</span>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link
            href="/"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              !onPlan
                ? "bg-lavender-200 text-lavender-700"
                : "text-ink-soft hover:bg-lavender-100"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/plan"
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              onPlan
                ? "bg-lavender-200 text-lavender-700"
                : "text-ink-soft hover:bg-lavender-100"
            }`}
          >
            Plan
          </Link>
          <button
            onClick={logout}
            className="ml-1 rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:bg-lavender-100"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
