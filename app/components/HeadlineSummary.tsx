import { MonthSummary } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/money";

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "warn";
}) {
  const valueColor =
    tone === "positive"
      ? "text-sage-600"
      : tone === "warn"
      ? "text-terracotta-700"
      : "text-ink";
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

export default function HeadlineSummary({ summary }: { summary: MonthSummary }) {
  const {
    income,
    currency,
    totalSpent,
    totalSaved,
    percentOfIncomeSpent,
    savingsRate,
    overUnder,
    projectedLeftover,
  } = summary;

  const underBudget = overUnder >= 0;

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Stat
        label="Monthly income"
        value={formatCurrency(income, currency)}
        sub="Combined household"
      />
      <Stat
        label="Total spent"
        value={formatCurrency(totalSpent, currency)}
        sub={`${formatPercent(percentOfIncomeSpent)} of income`}
      />
      <Stat
        label="% of income spent"
        value={formatPercent(percentOfIncomeSpent)}
        sub={`Leftover ${formatCurrency(Math.max(projectedLeftover, 0), currency)}`}
        tone={percentOfIncomeSpent > 1 ? "warn" : "neutral"}
      />
      <Stat
        label="Left this month"
        value={formatCurrency(totalSaved, currency)}
        sub="Income − expenses"
        tone={totalSaved >= 0 ? "positive" : "warn"}
      />
      <Stat
        label="Savings rate"
        value={formatPercent(savingsRate)}
        sub="Saving is good 🌿"
        tone="positive"
      />
      <Stat
        label={underBudget ? "Under plan" : "Over plan"}
        value={formatCurrency(Math.abs(overUnder), currency)}
        sub="Spending vs targets"
        tone={underBudget ? "positive" : "warn"}
      />
    </section>
  );
}
