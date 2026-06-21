import {
  daysInMonth,
  daysLeftInMonth,
  longDate,
  monthProgress,
} from "@/lib/money";

/**
 * Top-of-dashboard header: today's date and how much of the month remains, so
 * you immediately sense how far through the month you are.
 */
export default function DashboardHeader({ isCurrentMonth }: { isCurrentMonth: boolean }) {
  const now = new Date();
  const left = daysLeftInMonth(now);
  const total = daysInMonth(now);
  const progress = Math.min(1, monthProgress(now));

  return (
    <section className="card p-5">
      <p className="text-sm text-ink-soft">{longDate(now)}</p>
      {isCurrentMonth ? (
        <>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {left === 0 ? (
              <>Last day of the month</>
            ) : (
              <>
                {left} {left === 1 ? "day" : "days"} left
                <span className="text-ink-faint"> this month</span>
              </>
            )}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-lavender-100">
            <div
              className="h-full rounded-full bg-lavender-400 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">
            Day {now.getDate()} of {total}
          </p>
        </>
      ) : (
        <p className="mt-1 text-2xl font-semibold text-ink">A look back</p>
      )}
    </section>
  );
}
