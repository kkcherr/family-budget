import { getPlan } from "@/lib/queries";
import { getFinanceSummary } from "@/lib/finance";
import TopBar from "../components/TopBar";
import CreditCardsEditor from "../components/finance/CreditCardsEditor";
import AccountsEditor from "../components/finance/AccountsEditor";
import UpcomingEditor from "../components/finance/UpcomingEditor";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const [plan, finance] = await Promise.all([getPlan(), getFinanceSummary()]);
  const currency = plan.currency;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink">Cards &amp; cash</h1>
          <p className="text-sm text-ink-soft">
            Card balances and payments, your cash position, and upcoming big
            costs.
          </p>
        </div>

        <div className="space-y-8">
          <CreditCardsEditor cards={finance.cards} currency={currency} />
          <AccountsEditor
            accounts={finance.accounts}
            currency={currency}
            totalCardDebt={finance.totalCardDebt}
          />
          <UpcomingEditor payments={finance.upcoming} currency={currency} />
        </div>
      </main>
    </>
  );
}
