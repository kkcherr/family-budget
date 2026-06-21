/** Formatting helpers shared across the UI. */

export const DEFAULT_CURRENCY = "GBP";
const LOCALE = "en-GB";

export function formatCurrency(
  amount: number,
  currency = DEFAULT_CURRENCY
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** The bare currency symbol (e.g. "£", "$") for use as an input prefix. */
export function currencySymbol(currency = DEFAULT_CURRENCY): string {
  const parts = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

export function formatPercent(value: number, fractionDigits = 0): string {
  if (!isFinite(value)) return "—";
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

/** Percent of income a dollar amount represents (0..1+), safe when income=0. */
export function percentOfIncome(amount: number, income: number): number {
  if (!income || income <= 0) return 0;
  return amount / income;
}

/** Current month as 'YYYY-MM' in the given (or local) time. */
export function currentMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Validate a 'YYYY-MM' string. */
export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/** Human label for a 'YYYY-MM' month, e.g. "June 2026". */
export function monthLabel(month: string): string {
  if (!isValidMonth(month)) return month;
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Move a 'YYYY-MM' by a number of months (can be negative). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonth(d);
}

/** A long, friendly date, e.g. "Sunday, 21 June 2026". */
export function longDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Total days in the month containing `date`. */
export function daysInMonth(date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Whole days remaining in the month after today (today not counted). */
export function daysLeftInMonth(date = new Date()): number {
  return daysInMonth(date) - date.getDate();
}

/** How far through the month we are, 0..1 (by day). */
export function monthProgress(date = new Date()): number {
  return date.getDate() / daysInMonth(date);
}

/** Short due-date label, e.g. "1 Jul" or "15 Jun". */
export function shortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Format a 'YYYY-MM-DD' string as "1 Jul 2026" (timezone-safe). */
export function formatDateStr(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** A human "in N days" / "today" / "N days ago" relative phrase. */
export function relativeDays(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}
