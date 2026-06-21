export type CategoryGroup =
  | "essentials"
  | "lifestyle"
  | "health_family"
  | "financial";

export type CategoryKind = "spending" | "savings";

export const GROUP_LABELS: Record<CategoryGroup, string> = {
  essentials: "Essentials",
  lifestyle: "Lifestyle",
  health_family: "Health & family",
  financial: "Financial",
};

export const GROUP_ORDER: CategoryGroup[] = [
  "essentials",
  "lifestyle",
  "health_family",
  "financial",
];

export interface Plan {
  id: number;
  monthly_income: number;
  currency: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  group: CategoryGroup;
  target_amount: number;
  kind: CategoryKind;
  sort_order: number;
  archived: boolean;
}

/** A category joined with its actual spend for the selected month. */
export interface CategoryWithActual extends Category {
  actual: number;
}

/** Everything the dashboard needs for one month, including derived numbers. */
export interface MonthSummary {
  month: string; // 'YYYY-MM'
  income: number;
  currency: string;
  categories: CategoryWithActual[];
  // Derived headline figures
  totalSpent: number; // sum of actuals for spending categories
  totalSaved: number; // sum of actuals for savings categories
  totalPlannedSpending: number; // sum of targets for spending categories
  percentOfIncomeSpent: number; // totalSpent / income
  savingsRate: number; // totalSaved / income
  overUnder: number; // totalPlannedSpending - totalSpent (positive = under budget)
  projectedLeftover: number; // income - totalSpent - totalSaved
}
