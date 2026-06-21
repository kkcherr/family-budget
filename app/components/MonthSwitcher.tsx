"use client";

import { useRouter } from "next/navigation";
import { monthLabel, shiftMonth } from "@/lib/money";

export default function MonthSwitcher({
  month,
  months,
}: {
  month: string;
  months: string[];
}) {
  const router = useRouter();

  function go(m: string) {
    router.push(`/?month=${m}`);
  }

  // Always offer prev/next plus any tracked months in the dropdown.
  const options = Array.from(new Set([month, ...months])).sort().reverse();

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Previous month"
        onClick={() => go(shiftMonth(month, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-100 text-lavender-700 hover:bg-lavender-200"
      >
        ‹
      </button>

      <div className="relative">
        <select
          value={month}
          onChange={(e) => go(e.target.value)}
          className="appearance-none rounded-xl border border-lavender-200 bg-surface px-4 py-2 pr-9 text-sm font-medium text-ink shadow-soft-sm outline-none"
        >
          {options.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
          ▾
        </span>
      </div>

      <button
        aria-label="Next month"
        onClick={() => go(shiftMonth(month, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-100 text-lavender-700 hover:bg-lavender-200"
      >
        ›
      </button>
    </div>
  );
}
