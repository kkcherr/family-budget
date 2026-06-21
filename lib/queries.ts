import { sql } from "./db";
import {
  Category,
  CategoryWithActual,
  Frequency,
  MonthSummary,
  Plan,
  Section,
  monthlyEquivalent,
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
    section: r.section as Section,
    col: Number(r.col),
    target_amount: num(r.target_amount),
    frequency: r.frequency as Frequency,
    sort_order: Number(r.sort_order),
    archived: Boolean(r.archived),
  };
}

export async function getCategories(
  includeArchived = false
): Promise<Category[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT id, name, section, col, target_amount, frequency, sort_order, archived
    FROM categories
    ${includeArchived ? sql`` : sql`WHERE archived = FALSE`}
    ORDER BY section ASC, col ASC, sort_order ASC, id ASC
  `;
  return rows.map(mapCategory);
}

export async function createCategory(input: {
  name: string;
  section: Section;
  col?: number;
  target_amount?: number;
  frequency?: Frequency;
}): Promise<Category> {
  const col = input.col ?? 0;
  const next = await sql<{ next: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS next
    FROM categories WHERE section = ${input.section} AND col = ${col}
  `;
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO categories (name, section, col, target_amount, frequency, sort_order)
    VALUES (
      ${input.name},
      ${input.section},
      ${col},
      ${input.target_amount ?? 0},
      ${input.frequency ?? "monthly"},
      ${next[0].next}
    )
    RETURNING id, name, section, col, target_amount, frequency, sort_order, archived
  `;
  return mapCategory(rows[0]);
}

export async function updateCategory(
  id: number,
  input: Partial<{
    name: string;
    section: Section;
    col: number;
    target_amount: number;
    frequency: Frequency;
    archived: boolean;
  }>
): Promise<Category | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE categories SET
      name = ${input.name ?? sql`name`},
      section = ${input.section ?? sql`section`},
      col = ${input.col ?? sql`col`},
      target_amount = ${input.target_amount ?? sql`target_amount`},
      frequency = ${input.frequency ?? sql`frequency`},
      archived = ${input.archived ?? sql`archived`}
    WHERE id = ${id}
    RETURNING id, name, section, col, target_amount, frequency, sort_order, archived
  `;
  return rows[0] ? mapCategory(rows[0]) : null;
}

/** Soft-delete: archive so historical actuals are preserved. */
export async function archiveCategory(id: number): Promise<void> {
  await sql`UPDATE categories SET archived = TRUE WHERE id = ${id}`;
}

/**
 * Persist a new layout from drag-and-drop. `items` is the full ordered list of
 * visible categories; each carries its target section + sub-column. sort_order
 * is assigned by position within each (section, col) group.
 */
export async function applyLayout(
  items: { id: number; section: Section; col: number }[]
): Promise<void> {
  const counters = new Map<string, number>();
  await sql.begin(async (tx) => {
    for (const item of items) {
      const key = `${item.section}:${item.col}`;
      const order = (counters.get(key) ?? 0) + 1;
      counters.set(key, order);
      await tx`
        UPDATE categories
        SET section = ${item.section}, col = ${item.col}, sort_order = ${order}
        WHERE id = ${item.id}
      `;
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

/** Build the full month summary, including derived numbers. */
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

  const spending = withActuals.filter((c) => c.section !== "savings");
  const savings = withActuals.filter((c) => c.section === "savings");

  const totalSpent = spending.reduce((s, c) => s + c.actual, 0);
  const totalSaved = savings.reduce((s, c) => s + c.actual, 0);
  const totalPlannedSpending = spending.reduce(
    (s, c) => s + monthlyEquivalent(c.target_amount, c.frequency),
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

export interface YearMonthPoint {
  month: string; // 'YYYY-MM'
  monthIndex: number; // 0..11
  spent: number;
  saved: number;
}

export interface YearSummary {
  year: number;
  income: number; // monthly income from the plan
  currency: string;
  points: YearMonthPoint[]; // always 12 entries, Jan..Dec
  totalSpent: number;
  totalSaved: number;
  monthsWithData: number;
  avgMonthlySpend: number;
}

/** Per-month spent vs saved totals for a calendar year (for the YTD graph). */
export async function getYearSummary(year: number): Promise<YearSummary> {
  const plan = await getPlan();
  const rows = await sql<{ month: string; spent: string; saved: string }[]>`
    SELECT m.month,
      SUM(CASE WHEN c.section <> 'savings' THEN a.amount ELSE 0 END) AS spent,
      SUM(CASE WHEN c.section =  'savings' THEN a.amount ELSE 0 END) AS saved
    FROM months m
    JOIN actuals a ON a.month_id = m.id
    JOIN categories c ON c.id = a.category_id
    WHERE m.month LIKE ${year + "-%"}
    GROUP BY m.month
    ORDER BY m.month
  `;

  const byMonth = new Map<string, { spent: number; saved: number }>();
  for (const r of rows) {
    byMonth.set(r.month, { spent: num(r.spent), saved: num(r.saved) });
  }

  const points: YearMonthPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const v = byMonth.get(month) ?? { spent: 0, saved: 0 };
    points.push({ month, monthIndex: i, spent: v.spent, saved: v.saved });
  }

  const totalSpent = points.reduce((s, p) => s + p.spent, 0);
  const totalSaved = points.reduce((s, p) => s + p.saved, 0);
  const monthsWithData = byMonth.size;

  return {
    year,
    income: plan.monthly_income,
    currency: plan.currency,
    points,
    totalSpent,
    totalSaved,
    monthsWithData,
    avgMonthlySpend: monthsWithData > 0 ? totalSpent / monthsWithData : 0,
  };
}

/** Years that have any tracked data (for the year switcher). */
export async function getTrackedYears(includeYear: number): Promise<number[]> {
  const rows = await sql<{ y: string }[]>`
    SELECT DISTINCT LEFT(m.month, 4) AS y
    FROM months m JOIN actuals a ON a.month_id = m.id
    ORDER BY y DESC
  `;
  const set = new Set(rows.map((r) => Number(r.y)));
  set.add(includeYear);
  return Array.from(set).sort((a, b) => b - a);
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
