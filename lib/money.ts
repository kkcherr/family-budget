/** Formatting helpers shared across the UI. */

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
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
