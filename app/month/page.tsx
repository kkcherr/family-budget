import { getMonthSummary, getPlan, getTrackedMonths } from "@/lib/queries";
import { getFinanceSummary } from "@/lib/finance";
import { currentMonth, isValidMonth, monthLabel } from "@/lib/money";
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

        <MonthEditor initialPlan={plan} initialCategories={summary.categories} month={month} />

        <div className="mt-8 space-y-8">
          <CreditCardsEditor cards={finance.cards} currency={currency} />
          <AccountsEditor
            accounts={finance.accounts}
            currency={currency}
            totalCardDebt={finance.totalCardDebt}
          />
        </div>
      </main>
    </>
  );
}
