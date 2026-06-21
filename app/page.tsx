import { getMonthSummary, getTrackedMonths } from "@/lib/queries";
import { getFinanceSummary } from "@/lib/finance";
import { currentMonth, isValidMonth, monthLabel } from "@/lib/money";
import { sliceColor } from "@/lib/palette";
import TopBar from "./components/TopBar";
import MonthSwitcher from "./components/MonthSwitcher";
import DashboardHeader from "./components/DashboardHeader";
import HeadlineSummary from "./components/HeadlineSummary";
import DashboardSurfaces from "./components/DashboardSurfaces";
import Donut, { DonutSlice } from "./components/Donut";
import { formatCurrency, formatPercent } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && isValidMonth(params.month) ? params.month : currentMonth();
  const isCurrentMonth = month === currentMonth();

  const [summary, months, finance] = await Promise.all([
    getMonthSummary(month),
    getTrackedMonths(month),
    getFinanceSummary(),
  ]);

  const hasCategories = summary.categories.length > 0;

  // Donut slices by category, colored by section.
  const sectionIndex: Record<string, number> = {};
  const slices: DonutSlice[] = summary.categories
    .filter((c) => c.actual > 0)
    .map((c) => {
      const idx = sectionIndex[c.section] ?? 0;
      sectionIndex[c.section] = idx + 1;
      return {
        label: c.name,
        value: c.actual,
        color: sliceColor(c.section, idx),
      };
    });

  const totalForDonut = summary.totalSpent + summary.totalSaved;
  const hasActuals = totalForDonut > 0;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              {isCurrentMonth ? "This month" : monthLabel(month)}
            </h1>
            <p className="text-sm text-ink-soft">Your weekly money sync</p>
          </div>
          <MonthSwitcher month={month} months={months} />
        </div>

        {!hasCategories ? (
          <div className="card p-8 text-center">
            <p className="text-3xl">🌱</p>
            <h2 className="mt-3 text-lg font-semibold text-ink">
              Let&apos;s set up your plan
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Add your income and expense items to start your first check-in.
            </p>
            <Link href="/plan" className="btn-primary mt-5">
              Set up the plan
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <DashboardHeader isCurrentMonth={isCurrentMonth} />

            {/* Month-to-date at a glance */}
            <div>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
                  {monthLabel(month)} so far
                </h2>
                <Link
                  href={`/month?month=${month}`}
                  className="text-sm font-medium text-lavender-600 hover:text-lavender-700"
                >
                  Update →
                </Link>
              </div>
              <HeadlineSummary summary={summary} />
            </div>

            <section className="card p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-semibold text-ink">Where it goes</h2>
                <span className="text-sm text-ink-faint">
                  {formatCurrency(totalForDonut, summary.currency)} ·{" "}
                  {formatPercent(
                    summary.income > 0 ? totalForDonut / summary.income : 0
                  )}{" "}
                  of income
                </span>
              </div>
              {hasActuals ? (
                <Donut
                  slices={slices}
                  centerLabel="Used"
                  centerValue={formatPercent(
                    summary.income > 0 ? totalForDonut / summary.income : 0
                  )}
                  currency={summary.currency}
                />
              ) : (
                <div className="py-6 text-center text-sm text-ink-faint">
                  Nothing logged yet this month.{" "}
                  <Link
                    href={`/month?month=${month}`}
                    className="font-medium text-lavender-600 hover:text-lavender-700"
                  >
                    Add your first amounts →
                  </Link>
                </div>
              )}
            </section>

            <DashboardSurfaces finance={finance} currency={summary.currency} />
          </div>
        )}
      </main>
    </>
  );
}
