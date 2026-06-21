import { sql } from "./db";
import {
  Category,
  CategoryGroup,
  CategoryKind,
  CategoryWithActual,
  MonthSummary,
  Plan,
} from "./types";
import { isValidMonth, percentOfIncome } from "./money";

// postgres.js returns NUMERIC columns as strings; coerce to numbers.
const num = (v: unknown): number => (v == null ? 0 : Number(v));

export async function getPlan(): Promise<Plan> {
  const rows = await sql<
    { id: number; monthly_income: string; currency: string; updated_at: string }[]
  >`SELECT id, monthly_income, currency, updated_at FROM plan WHERE id = 1`;
  const row = rows[0];
  return {
    id: 1,
    monthly_income: num(row?.monthly_income),
    currency: row?.currency ?? "GBP",
    updated_at: row?.updated_at ?? new Date().toISOString(),
  };
}

export async function updatePlan(
  monthlyIncome: number,
  currency = "GBP"
): Promise<Plan> {
  await sql`
    INSERT INTO plan (id, monthly_income, currency, updated_at)
    VALUES (1, ${monthlyIncome}, ${currency}, now())
    ON CONFLICT (id) DO UPDATE
      SET monthly_income = EXCLUDED.monthly_income,
          currency = EXCLUDED.currency,
          updated_at = now()
  `;
  return getPlan();
}

function mapCategory(r: Record<string, unknown>): Category {
  return {
    id: Number(r.id),
    name: String(r.name),
    group: r.group as CategoryGroup,
    target_amount: num(r.target_amount),
    kind: r.kind as CategoryKind,
    sort_order: Number(r.sort_order),
    archived: Boolean(r.archived),
  };
}

export async function getCategories(
  includeArchived = false
): Promise<Category[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT id, name, "group", target_amount, kind, sort_order, archived
    FROM categories
    ${includeArchived ? sql`` : sql`WHERE archived = FALSE`}
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(mapCategory);
}

export async function createCategory(input: {
  name: string;
  group: CategoryGroup;
  target_amount: number;
  kind: CategoryKind;
}): Promise<Category> {
  const next = await sql<{ next: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories
  `;
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO categories (name, "group", target_amount, kind, sort_order)
    VALUES (${input.name}, ${input.group}, ${input.target_amount}, ${input.kind}, ${next[0].next})
    RETURNING id, name, "group", target_amount, kind, sort_order, archived
  `;
  return mapCategory(rows[0]);
}

export async function updateCategory(
  id: number,
  input: Partial<{
    name: string;
    group: CategoryGroup;
    target_amount: number;
    kind: CategoryKind;
    archived: boolean;
  }>
): Promise<Category | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE categories SET
      name = ${input.name ?? sql`name`},
      "group" = ${input.group ?? sql`"group"`},
      target_amount = ${input.target_amount ?? sql`target_amount`},
      kind = ${input.kind ?? sql`kind`},
      archived = ${input.archived ?? sql`archived`}
    WHERE id = ${id}
    RETURNING id, name, "group", target_amount, kind, sort_order, archived
  `;
  return rows[0] ? mapCategory(rows[0]) : null;
}

/** Soft-delete: archive so historical actuals are preserved. */
export async function archiveCategory(id: number): Promise<void> {
  await sql`UPDATE categories SET archived = TRUE WHERE id = ${id}`;
}

/** Persist a new order. Accepts category ids in their desired order. */
export async function reorderCategories(ids: number[]): Promise<void> {
  await sql.begin(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx`UPDATE categories SET sort_order = ${i + 1} WHERE id = ${ids[i]}`;
    }
  });
}

async function getOrCreateMonthId(month: string): Promise<number> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO months (month) VALUES (${month})
    ON CONFLICT (month) DO UPDATE SET month = EXCLUDED.month
    RETURNING id
  `;
  return rows[0].id;
}

/** Overwrite the running total for one category in one month. */
export async function upsertActual(
  month: string,
  categoryId: number,
  amount: number
): Promise<void> {
  if (!isValidMonth(month)) throw new Error("Invalid month");
  const monthId = await getOrCreateMonthId(month);
  await sql`
    INSERT INTO actuals (month_id, category_id, amount, updated_at)
    VALUES (${monthId}, ${categoryId}, ${amount}, now())
    ON CONFLICT (month_id, category_id) DO UPDATE
      SET amount = EXCLUDED.amount, updated_at = now()
  `;
}

/** All actuals for a month, keyed by category id. */
async function getActualsForMonth(
  month: string
): Promise<Map<number, number>> {
  const rows = await sql<{ category_id: number; amount: string }[]>`
    SELECT a.category_id, a.amount
    FROM actuals a
    JOIN months m ON m.id = a.month_id
    WHERE m.month = ${month}
  `;
  const map = new Map<number, number>();
  for (const r of rows) map.set(Number(r.category_id), num(r.amount));
  return map;
}

/** Build the full dashboard summary for a month, including derived numbers. */
export async function getMonthSummary(month: string): Promise<MonthSummary> {
  const [plan, categories, actuals] = await Promise.all([
    getPlan(),
    getCategories(false),
    getActualsForMonth(month),
  ]);

  const withActuals: CategoryWithActual[] = categories.map((c) => ({
    ...c,
    actual: actuals.get(c.id) ?? 0,
  }));

  const spending = withActuals.filter((c) => c.kind === "spending");
  const savings = withActuals.filter((c) => c.kind === "savings");

  const totalSpent = spending.reduce((s, c) => s + c.actual, 0);
  const totalSaved = savings.reduce((s, c) => s + c.actual, 0);
  const totalPlannedSpending = spending.reduce(
    (s, c) => s + c.target_amount,
    0
  );

  const income = plan.monthly_income;

  return {
    month,
    income,
    currency: plan.currency,
    categories: withActuals,
    totalSpent,
    totalSaved,
    totalPlannedSpending,
    percentOfIncomeSpent: percentOfIncome(totalSpent, income),
    savingsRate: percentOfIncome(totalSaved, income),
    overUnder: totalPlannedSpending - totalSpent,
    projectedLeftover: income - totalSpent - totalSaved,
  };
}

/** Distinct months that have any actuals, newest first, plus the given month. */
export async function getTrackedMonths(include: string): Promise<string[]> {
  const rows = await sql<{ month: string }[]>`
    SELECT DISTINCT m.month
    FROM months m
    JOIN actuals a ON a.month_id = m.id
    ORDER BY m.month DESC
  `;
  const set = new Set(rows.map((r) => r.month));
  if (isValidMonth(include)) set.add(include);
  return Array.from(set).sort().reverse();
}
