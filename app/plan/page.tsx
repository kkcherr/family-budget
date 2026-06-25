import { getCategories, getPlan } from "@/lib/queries";
import TopBar from "../components/TopBar";
import PlanEditor from "../components/PlanEditor";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [plan, categories] = await Promise.all([
    getPlan(),
    getCategories(false),
  ]);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-ink">Your plan</h1>
          <p className="text-sm text-ink-soft">
            One shared plan for every month. Targets are dollars, shown as a
            share of income.
          </p>
        </div>
        <PlanEditor initialPlan={plan} initialCategories={categories} />
      </main>
    </>
  );
}
