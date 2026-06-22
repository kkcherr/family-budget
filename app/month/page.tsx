import { getMonthSummary, getTrackedMonths } from "@/lib/queries";
import { currentMonth, isValidMonth, monthLabel } from "@/lib/money";
import { SECTION_LABELS, SECTION_ORDER, Section } from "@/lib/types";
import { SECTION_BAND } from "@/lib/palette";
import { formatCurrency, formatPercent } from "@/lib/money";
import TopBar from "../components/TopBar";
import MonthSwitcher from "../components/MonthSwitcher";
import CategoryRow from "../components/CategoryRow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MonthPage({
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

  const bySection = SECTION_ORDER.map((s) => ({
    section: s as Section,
    items: summary.categories.filter((c) => c.section === s),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              {monthLabel(month)}
            </h1>
            <p className="text-sm text-ink-soft">
              Fill in what you&apos;ve actually spent and saved.
            </p>
          </div>
          <MonthSwitcher month={month} months={months} />
        </div>

        {!hasCategories ? (
          <div className="card p-8 text-center">
            <p className="text-3xl">🌱</p>
            <h2 className="mt-3 text-lg font-semibold text-ink">
              No plan yet
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Set up your income and expense items first.
            </p>
            <Link href="/plan" className="btn-primary mt-5">
              Go to the plan
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compact month-to-date totals */}
            <section className="grid grid-cols-3 gap-2 text-center">
              <Tally label="Spent" value={formatCurrency(summary.totalSpent, summary.currency)} />
              <Tally label="Saved" value={formatCurrency(summary.totalSaved, summary.currency)} tone="sage" />
              <Tally
                label="of income"
                value={formatPercent(summary.percentOfIncomeSpent)}
              />
            </section>

            <section className="space-y-5">
              {bySection.map(({ section, items }) => (
                <div key={section}>
                  <h3
                    className={`mb-2.5 inline-block rounded-lg px-2.5 py-1 text-sm font-semibold uppercase tracking-wide ${SECTION_BAND[section].bg} ${SECTION_BAND[section].text}`}
                  >
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

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "sage";
}) {
  return (
    <div className={`rounded-xl px-2 py-2 ${tone === "sage" ? "bg-sage-100" : "bg-lavender-100"}`}>
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}
