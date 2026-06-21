export type Section = "fixed" | "variable" | "savings";

export type Frequency =
  | "monthly"
  | "twice_monthly"
  | "every_3_months"
  | "every_6_months"
  | "every_12_months"
  | "one_off";

export const SECTION_LABELS: Record<Section, string> = {
  fixed: "Fixed expenses",
  variable: "Variable expenses",
  savings: "Savings",
};

export const SECTION_ORDER: Section[] = ["fixed", "variable", "savings"];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "Monthly",
  twice_monthly: "Twice a month",
  every_3_months: "Every 3 months",
  every_6_months: "Every 6 months",
  every_12_months: "Every 12 months",
  one_off: "One-off",
};

export const FREQUENCY_ORDER: Frequency[] = [
  "monthly",
  "twice_monthly",
  "every_3_months",
  "every_6_months",
  "every_12_months",
  "one_off",
];

/** How many times per year a frequency is paid (one-off excluded from recurring). */
export const OCCURRENCES_PER_YEAR: Record<Frequency, number> = {
  monthly: 12,
  twice_monthly: 24,
  every_3_months: 4,
  every_6_months: 2,
  every_12_months: 1,
  one_off: 0,
};

/** The averaged monthly cost of a per-occurrence amount at a given frequency. */
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  return (amount * OCCURRENCES_PER_YEAR[frequency]) / 12;
}

export interface Plan {
  id: number;
  monthly_income: number;
  currency: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  section: Section;
  col: number; // 0 or 1 — which sub-column the item sits in
  target_amount: number; // per occurrence, in pounds
  frequency: Frequency;
  sort_order: number;
  archived: boolean;
}

/** A category joined with its actual spend for the selected month. */
export interface CategoryWithActual extends Category {
  actual: number;
}

/** Everything the month view needs, including derived numbers. */
export interface MonthSummary {
  month: string; // 'YYYY-MM'
  income: number;
  currency: string;
  categories: CategoryWithActual[];
  // Derived headline figures (month-to-date actuals)
  totalSpent: number; // sum of actuals for fixed + variable
  totalSaved: number; // sum of actuals for savings
  totalPlannedSpending: number; // sum of monthly-equivalent targets, fixed + variable
  percentOfIncomeSpent: number; // totalSpent / income
  savingsRate: number; // totalSaved / income
  overUnder: number; // totalPlannedSpending - totalSpent (positive = under budget)
  projectedLeftover: number; // income - totalSpent - totalSaved
}
