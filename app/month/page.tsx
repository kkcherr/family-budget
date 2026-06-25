import { getMonthSummary, getTrackedMonths } from "@/lib/queries";
import { currentMonth, isValidMonth, monthLabel } from "@/lib/money";
import TopBar from "../components/TopBar";
import MonthSwitcher from "../components/MonthSwitcher";
import MonthEditor from "../components/MonthEditor";
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

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">
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
            <h2 className="mt-3 text-lg font-semibold text-ink">No plan yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Set up your income and expense items first.
            </p>
            <Link href="/plan" className="btn-primary mt-5">
              Go to the plan
            </Link>
          </div>
        ) : (
          <MonthEditor
            initialCategories={summary.categories}
            income={summary.income}
            currency={summary.currency}
            month={month}
          />
        )}
      </main>
    </>
  );
}
