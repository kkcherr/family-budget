import { sql } from "./db";
import {
  Account,
  CreditCard,
  DueKind,
  FinanceSummary,
  UpcomingPayment,
  nextDue,
  totalOwed,
} from "./finance-types";

export type {
  Account,
  CreditCard,
  DueKind,
  FinanceSummary,
  UpcomingPayment,
} from "./finance-types";

const num = (v: unknown): number => (v == null ? 0 : Number(v));

// --- Credit cards ----------------------------------------------------------

function mapCard(r: Record<string, unknown>): CreditCard {
  return {
    id: Number(r.id),
    name: String(r.name),
    balance: num(r.balance),
    statement_balance: num(r.statement_balance),
    due_kind: r.due_kind as DueKind,
    due_day: r.due_day == null ? null : Number(r.due_day),
    due_date: (r.due_date as string | null) ?? null,
    statement_day: r.statement_day == null ? null : Number(r.statement_day),
    note: (r.note as string | null) ?? null,
    sort_order: Number(r.sort_order),
    archived: Boolean(r.archived),
  };
}

export async function getCreditCards(): Promise<CreditCard[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT id, name, balance, statement_balance, due_kind, due_day, due_date::text AS due_date,
           statement_day, note, sort_order, archived
    FROM credit_cards WHERE archived = FALSE
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(mapCard);
}

export async function createCreditCard(name: string): Promise<CreditCard> {
  const next = await sql<{ n: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM credit_cards
  `;
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO credit_cards (name, due_kind, due_day, sort_order)
    VALUES (${name}, 'monthly_day', 1, ${next[0].n})
    RETURNING id, name, balance, statement_balance, due_kind, due_day, due_date::text AS due_date,
              statement_day, note, sort_order, archived
  `;
  return mapCard(rows[0]);
}

export async function updateCreditCard(
  id: number,
  p: Partial<Omit<CreditCard, "id" | "sort_order" | "archived">> & {
    archived?: boolean;
  }
): Promise<CreditCard | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE credit_cards SET
      name = ${p.name ?? sql`name`},
      balance = ${p.balance ?? sql`balance`},
      statement_balance = ${p.statement_balance === undefined ? sql`statement_balance` : p.statement_balance},
      due_kind = ${p.due_kind ?? sql`due_kind`},
      due_day = ${p.due_day === undefined ? sql`due_day` : p.due_day},
      due_date = ${p.due_date === undefined ? sql`due_date` : p.due_date},
      statement_day = ${p.statement_day === undefined ? sql`statement_day` : p.statement_day},
      note = ${p.note === undefined ? sql`note` : p.note},
      archived = ${p.archived ?? sql`archived`}
    WHERE id = ${id}
    RETURNING id, name, balance, statement_balance, due_kind, due_day, due_date::text AS due_date,
              statement_day, note, sort_order, archived
  `;
  return rows[0] ? mapCard(rows[0]) : null;
}

export async function archiveCreditCard(id: number): Promise<void> {
  await sql`UPDATE credit_cards SET archived = TRUE WHERE id = ${id}`;
}

/** Persist a drag-reorder: ids in their new order set sort_order 1..n. */
async function reorder(table: "credit_cards" | "accounts" | "upcoming_payments", ids: number[]) {
  await sql.begin(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      if (table === "credit_cards")
        await tx`UPDATE credit_cards SET sort_order = ${i + 1} WHERE id = ${ids[i]}`;
      else if (table === "accounts")
        await tx`UPDATE accounts SET sort_order = ${i + 1} WHERE id = ${ids[i]}`;
      else
        await tx`UPDATE upcoming_payments SET sort_order = ${i + 1} WHERE id = ${ids[i]}`;
    }
  });
}

export const reorderCreditCards = (ids: number[]) => reorder("credit_cards", ids);
export const reorderAccounts = (ids: number[]) => reorder("accounts", ids);
export const reorderUpcomingPayments = (ids: number[]) => reorder("upcoming_payments", ids);

// --- Accounts --------------------------------------------------------------

function mapAccount(r: Record<string, unknown>): Account {
  return {
    id: Number(r.id),
    name: String(r.name),
    balance: num(r.balance),
    sort_order: Number(r.sort_order),
    archived: Boolean(r.archived),
  };
}

export async function getAccounts(): Promise<Account[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT id, name, balance, sort_order, archived
    FROM accounts WHERE archived = FALSE
    ORDER BY sort_order ASC, id ASC
  `;
  return rows.map(mapAccount);
}

export async function createAccount(name: string): Promise<Account> {
  const next = await sql<{ n: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM accounts
  `;
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO accounts (name, sort_order) VALUES (${name}, ${next[0].n})
    RETURNING id, name, balance, sort_order, archived
  `;
  return mapAccount(rows[0]);
}

export async function updateAccount(
  id: number,
  p: { name?: string; balance?: number; archived?: boolean }
): Promise<Account | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE accounts SET
      name = ${p.name ?? sql`name`},
      balance = ${p.balance ?? sql`balance`},
      archived = ${p.archived ?? sql`archived`}
    WHERE id = ${id}
    RETURNING id, name, balance, sort_order, archived
  `;
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function archiveAccount(id: number): Promise<void> {
  await sql`UPDATE accounts SET archived = TRUE WHERE id = ${id}`;
}

// --- Upcoming big payments -------------------------------------------------

function mapUpcoming(r: Record<string, unknown>): UpcomingPayment {
  return {
    id: Number(r.id),
    name: String(r.name),
    amount: num(r.amount),
    saved_so_far: num(r.saved_so_far),
    due_date: (r.due_date as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    sort_order: Number(r.sort_order),
    archived: Boolean(r.archived),
  };
}

export async function getUpcomingPayments(): Promise<UpcomingPayment[]> {
  const rows = await sql<Record<string, unknown>[]>`
    SELECT id, name, amount, saved_so_far, due_date::text AS due_date,
           note, sort_order, archived
    FROM upcoming_payments WHERE archived = FALSE
    ORDER BY (due_date IS NULL) ASC, due_date ASC, sort_order ASC, id ASC
  `;
  return rows.map(mapUpcoming);
}

export async function createUpcomingPayment(
  name: string
): Promise<UpcomingPayment> {
  const next = await sql<{ n: number }[]>`
    SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM upcoming_payments
  `;
  const rows = await sql<Record<string, unknown>[]>`
    INSERT INTO upcoming_payments (name, sort_order) VALUES (${name}, ${next[0].n})
    RETURNING id, name, amount, saved_so_far, due_date::text AS due_date,
              note, sort_order, archived
  `;
  return mapUpcoming(rows[0]);
}

export async function updateUpcomingPayment(
  id: number,
  p: {
    name?: string;
    amount?: number;
    saved_so_far?: number;
    due_date?: string | null;
    note?: string | null;
    archived?: boolean;
  }
): Promise<UpcomingPayment | null> {
  const rows = await sql<Record<string, unknown>[]>`
    UPDATE upcoming_payments SET
      name = ${p.name ?? sql`name`},
      amount = ${p.amount ?? sql`amount`},
      saved_so_far = ${p.saved_so_far ?? sql`saved_so_far`},
      due_date = ${p.due_date === undefined ? sql`due_date` : p.due_date},
      note = ${p.note === undefined ? sql`note` : p.note},
      archived = ${p.archived ?? sql`archived`}
    WHERE id = ${id}
    RETURNING id, name, amount, saved_so_far, due_date::text AS due_date,
              note, sort_order, archived
  `;
  return rows[0] ? mapUpcoming(rows[0]) : null;
}

export async function archiveUpcomingPayment(id: number): Promise<void> {
  await sql`UPDATE upcoming_payments SET archived = TRUE WHERE id = ${id}`;
}

// --- Combined summary (for the dashboard) ----------------------------------

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const [cards, accounts, upcoming] = await Promise.all([
    getCreditCards(),
    getAccounts(),
    getUpcomingPayments(),
  ]);

  const totalCardDebt = cards.reduce((s, c) => s + totalOwed(c), 0);
  const totalCash = accounts.reduce((s, a) => s + a.balance, 0);

  // Soonest upcoming card payment by due date.
  let nextCardPayment: FinanceSummary["nextCardPayment"] = null;
  for (const card of cards) {
    const due = nextDue(card);
    if (!due) continue;
    if (
      !nextCardPayment ||
      !nextCardPayment.due ||
      due < nextCardPayment.due
    ) {
      nextCardPayment = { card, due };
    }
  }

  const totalStillToSetAside = upcoming.reduce(
    (s, u) => s + Math.max(u.amount - u.saved_so_far, 0),
    0
  );

  return {
    cards,
    accounts,
    upcoming,
    totalCardDebt,
    totalCash,
    freeMoney: totalCash - totalCardDebt,
    nextCardPayment,
    totalStillToSetAside,
  };
}
