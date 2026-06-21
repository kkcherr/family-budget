import Link from "next/link";
import { getYearSummary, getTrackedYears } from "@/lib/queries";
import { formatCurrency, formatPercent, percentOfIncome } from "@/lib/money";
import TopBar from "../components/TopBar";
import YearChart from "../components/YearChart";

export const dynamic = "force-dynamic";

export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const parsed = Number(params.year);
  const year =
    Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100
      ? parsed
      : now.getFullYear();

  const [summary, years] = await Promise.all([
    getYearSummary(year),
    getTrackedYears(year),
  ]);

  const hasData = summary.monthsWithData > 0;
  const yearlyIncome = summary.income * summary.monthsWithData;
  const savingsRate =
    yearlyIncome > 0 ? summary.totalSaved / yearlyIncome : 0;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Year to date</h1>
            <p className="text-sm text-ink-soft">
              How {year} is trending across the months.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/year?year=${year - 1}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-100 text-lavender-700 hover:bg-lavender-200"
              aria-label="Previous year"
            >
              ‹
            </Link>
            <span className="rounded-xl border border-lavender-200 bg-surface px-4 py-2 text-sm font-medium text-ink shadow-soft-sm">
              {year}
            </span>
            <Link
              href={`/year?year=${year + 1}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-lavender-100 text-lavender-700 hover:bg-lavender-200"
              aria-label="Next year"
            >
              ›
            </Link>
          </div>
        </div>

        {!hasData ? (
          <div className="card p-8 text-center">
            <p className="text-3xl">📈</p>
            <h2 className="mt-3 text-lg font-semibold text-ink">
              No data for {year} yet
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Once you log a few months, your trend will appear here.
            </p>
            {years.length > 1 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {years.map((y) => (
                  <Link
                    key={y}
                    href={`/year?year=${y}`}
                    className="rounded-lg bg-lavender-100 px-3 py-1 text-sm text-lavender-700 hover:bg-lavender-200"
                  >
                    {y}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Spent YTD" value={formatCurrency(summary.totalSpent, summary.currency)} />
              <Stat label="Saved YTD" value={formatCurrency(summary.totalSaved, summary.currency)} tone="sage" />
              <Stat
                label="Avg / month"
                value={formatCurrency(summary.avgMonthlySpend, summary.currency)}
                sub={`${summary.monthsWithData} ${summary.monthsWithData === 1 ? "month" : "months"}`}
              />
              <Stat
                label="Savings rate"
                value={formatPercent(savingsRate)}
                tone="sage"
                sub={
                  summary.income > 0
                    ? `${formatPercent(percentOfIncome(summary.avgMonthlySpend, summary.income))} spent`
                    : undefined
                }
              />
            </section>

            <section className="card p-5">
              <YearChart points={summary.points} currency={summary.currency} />
            </section>
          </div>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "sage";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone === "sage" ? "text-sage-600" : "text-ink"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}
