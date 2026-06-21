import Link from "next/link";
import { FinanceSummary, daysUntil } from "@/lib/finance-types";
import {
  formatCurrency,
  formatDateStr,
  relativeDays,
} from "@/lib/money";

/**
 * The dashboard "at a glance" reminders: the soonest credit card payment, your
 * cash position, and the next big upcoming payment. Each links to the full
 * Cards & cash screen.
 */
export default function DashboardSurfaces({
  finance,
  currency,
}: {
  finance: FinanceSummary;
  currency: string;
}) {
  const next = finance.nextCardPayment;
  const nextDueDays = next ? daysUntil(next.due) : null;

  // Soonest upcoming payment with a due date and money still to set aside.
  const upcoming = finance.upcoming
    .filter((u) => u.amount - u.saved_so_far > 0)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    })[0];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {/* Credit cards */}
      <SurfaceCard icon="💳" title="Credit cards" href="/finances">
        {next && next.due ? (
          <>
            <p className="text-lg font-semibold tabular-nums text-ink">
              {formatCurrency(next.card.balance, currency)}
            </p>
            <p className="text-xs text-ink-soft">
              {next.card.name} · by {formatDateStr(next.due)}
            </p>
            {nextDueDays !== null && (
              <p className="text-[11px] text-ink-faint">
                {relativeDays(nextDueDays)} ·{" "}
                {formatCurrency(finance.totalCardDebt, currency)} owed total
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-ink-faint">
            Add card balances to see payments due.
          </p>
        )}
      </SurfaceCard>

      {/* Cash position */}
      <SurfaceCard icon="🏦" title="Cash position" href="/finances">
        <p
          className={`text-lg font-semibold tabular-nums ${
            finance.freeMoney >= 0 ? "text-sage-600" : "text-blush-700"
          }`}
        >
          {formatCurrency(finance.freeMoney, currency)}
        </p>
        <p className="text-xs text-ink-soft">free after card debt</p>
        <p className="text-[11px] text-ink-faint">
          {formatCurrency(finance.totalCash, currency)} cash ·{" "}
          {formatCurrency(finance.totalCardDebt, currency)} owed
        </p>
      </SurfaceCard>

      {/* Upcoming big payments */}
      <SurfaceCard icon="📅" title="Upcoming" href="/finances">
        {upcoming ? (
          <>
            <p className="text-lg font-semibold tabular-nums text-ink">
              {formatCurrency(
                upcoming.amount - upcoming.saved_so_far,
                currency
              )}
            </p>
            <p className="truncate text-xs text-ink-soft">
              {upcoming.name} still to set aside
            </p>
            {upcoming.due_date && (
              <p className="text-[11px] text-ink-faint">
                due {formatDateStr(upcoming.due_date)}
              </p>
            )}
          </>
        ) : finance.totalStillToSetAside > 0 ? (
          <p className="text-lg font-semibold tabular-nums text-ink">
            {formatCurrency(finance.totalStillToSetAside, currency)}
          </p>
        ) : (
          <p className="text-xs text-ink-faint">Nothing to set aside.</p>
        )}
      </SurfaceCard>
    </section>
  );
}

function SurfaceCard({
  icon,
  title,
  href,
  children,
}: {
  icon: string;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card block p-4 transition-colors hover:border-lavender-300"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </Link>
  );
}
