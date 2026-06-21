import { getMonthSummary, getTrackedMonths } from "@/lib/queries";
import { currentMonth, isValidMonth, monthLabel } from "@/lib/money";
import { SECTION_LABELS, SECTION_ORDER, Section } from "@/lib/types";
import { sliceColor } from "@/lib/palette";
import TopBar from "./components/TopBar";
import MonthSwitcher from "./components/MonthSwitcher";
import HeadlineSummary from "./components/HeadlineSummary";
import Donut, { DonutSlice } from "./components/Donut";
import CategoryRow from "./components/CategoryRow";
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

  const [summary, months] = await Promise.all([
    getMonthSummary(month),
    getTrackedMonths(month),
  ]);

  const hasCategories = summary.categories.length > 0;

  // Build donut slices by category, colored by section.
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

  // Group categories by section for the list.
  const bySection = SECTION_ORDER.map((s) => ({
    section: s as Section,
    items: summary.categories.filter((c) => c.section === s),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              {monthLabel(month)}
            </h1>
            <p className="text-sm text-ink-soft">Your weekly check-in</p>
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
              Add your income and expense categories to start your first
              check-in.
            </p>
            <Link href="/plan" className="btn-primary mt-5">
              Set up the plan
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <HeadlineSummary summary={summary} />

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
              <Donut
                slices={slices}
                centerLabel="Used"
                centerValue={formatPercent(
                  summary.income > 0 ? totalForDonut / summary.income : 0
                )}
                currency={summary.currency}
              />
            </section>

            <section className="space-y-5">
              {bySection.map(({ section, items }) => (
                <div key={section}>
                  <h3 className="mb-2.5 px-1 text-sm font-semibold uppercase tracking-wide text-lavender-700">
                    {SECTION_LABELS[section]}
                  </h3>
                  <div className="space-y-2.5">
                    {items.map((c) => (
                      <CategoryRow
                        key={c.id}
                        category={c}
                        income={summary.income}
                        month={month}
                        currency={summary.currency}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <p className="pt-2 text-center text-xs text-ink-faint">
              Tap any amount to update your running total for {monthLabel(month)}.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
