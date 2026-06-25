import { getPlan } from "@/lib/queries";
import { getSavingsPots } from "@/lib/finance";
import TopBar from "../components/TopBar";
import SavingsEditor from "../components/finance/SavingsEditor";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const [plan, pots] = await Promise.all([getPlan(), getSavingsPots()]);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink">Savings</h1>
          <p className="text-sm text-ink-soft">
            Where your savings sit — an overall total and each pot.
          </p>
        </div>
        <SavingsEditor pots={pots} currency={plan.currency} />
      </main>
    </>
  );
}
