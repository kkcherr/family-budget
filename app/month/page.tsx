import { getMonthSummary, getPlan, getTrackedMonths } from "@/lib/queries";
import { getFinanceSummary } from "@/lib/finance";
import { currentMonth, formatCurrency, isValidMonth, monthLabel } from "@/lib/money";
import TopBar from "../components/TopBar";
import MonthSwitcher from "../components/MonthSwitcher";
import MonthEditor from "../components/MonthEditor";
import CreditCardsEditor from "../components/finance/CreditCardsEditor";
import AccountsEditor from "../components/finance/AccountsEditor";

export const dynamic = "force-dynamic";

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && isValidMonth(params.month) ? params.month : currentMonth();

  const [plan, summary, months, finance] = await Promise.all([
    getPlan(),
    getMonthSummary(month),
    getTrackedMonths(month),
    getFinanceSummary(),
  ]);
  const currency = plan.currency;
  const covers = finance.totalCash - finance.totalCardDebt; // positive = can cover

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">{monthLabel(month)}</h1>
            <p className="text-sm text-ink-soft">
              Your plan and what you&apos;ve spent &amp; saved this month.
            </p>
          </div>
          <MonthSwitcher month={month} months={months} />
        </div>

        {/* Cards vs cash, side by side for comparison */}
        <div className="grid gap-4 lg:grid-cols-2">
          <CreditCardsEditor cards={finance.cards} currency={currency} />
          <AccountsEditor accounts={finance.accounts} currency={currency} />
        </div>

        {/* Can the accounts cover the cards? */}
        <div
          className={`mt-3 rounded-2xl border p-4 text-center ${
            covers >= 0
              ? "border-sage-400/40 bg-sage-100 text-sage-600"
              : "border-terracotta-300 bg-terracotta-100 text-terracotta-700"
          }`}
        >
          {covers >= 0 ? (
            <p className="text-sm">
              Your accounts cover the cards —{" "}
              <strong>{formatCurrency(covers, currency)}</strong> to spare
            </p>
          ) : (
            <p className="text-sm">
              <strong>{formatCurrency(Math.abs(covers), currency)}</strong> short of
              covering the cards
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {formatCurrency(finance.totalCash, currency)} in accounts ·{" "}
            {formatCurrency(finance.totalCardDebt, currency)} owed on cards
          </p>
        </div>

        <div className="mt-6">
          <MonthEditor initialPlan={plan} initialCategories={summary.categories} month={month} />
        </div>
      </main>
    </>
  );
}
