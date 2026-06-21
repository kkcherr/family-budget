// Pure types + date helpers for the finance features. No DB import here, so
// client components can use these safely.

export type DueKind = "monthly_day" | "fixed_date" | "none";

export interface CreditCard {
  id: number;
  name: string;
  balance: number; // current amount owed
  due_kind: DueKind;
  due_day: number | null; // day-of-month for monthly_day
  due_date: string | null; // 'YYYY-MM-DD' for fixed_date
  statement_day: number | null; // informational
  note: string | null;
  sort_order: number;
  archived: boolean;
}

export interface Account {
  id: number;
  name: string;
  balance: number;
  sort_order: number;
  archived: boolean;
}

export interface UpcomingPayment {
  id: number;
  name: string;
  amount: number; // total cost
  saved_so_far: number; // already set aside
  due_date: string | null; // 'YYYY-MM-DD'
  note: string | null;
  sort_order: number;
  archived: boolean;
}

export interface FinanceSummary {
  cards: CreditCard[];
  accounts: Account[];
  upcoming: UpcomingPayment[];
  totalCardDebt: number;
  totalCash: number;
  freeMoney: number; // cash - card debt
  nextCardPayment: { card: CreditCard; due: string | null } | null;
  totalStillToSetAside: number;
}

/** True only for a real calendar date in 'YYYY-MM-DD' form. */
export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function todayStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonthOf(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/** Next date (inclusive of today) landing on `day`, as 'YYYY-MM-DD'. */
export function nextMonthlyDay(day: number, from = new Date()): string {
  const y = from.getFullYear();
  const m = from.getMonth();
  const clamp = (yy: number, mm: number) => Math.min(day, daysInMonthOf(yy, mm));
  const thisMonth = new Date(y, m, clamp(y, m));
  if (thisMonth.getDate() >= from.getDate()) return todayStr(thisMonth);
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  return todayStr(new Date(ny, nm, clamp(ny, nm)));
}

/** Whole days from today until a 'YYYY-MM-DD' (negative if past). */
export function daysUntil(
  dateStr: string | null,
  from = new Date()
): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** The next "pay by" date for a card, as 'YYYY-MM-DD' or null. */
export function nextDue(card: CreditCard, from = new Date()): string | null {
  if (card.due_kind === "fixed_date") return card.due_date;
  if (card.due_kind === "monthly_day" && card.due_day)
    return nextMonthlyDay(card.due_day, from);
  return null;
}
