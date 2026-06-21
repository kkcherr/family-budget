"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryWithActual } from "@/lib/types";
import {
  currencySymbol,
  formatCurrency,
  formatPercent,
  percentOfIncome,
} from "@/lib/money";
import ProgressBar from "./ProgressBar";

export default function CategoryRow({
  category,
  income,
  month,
  currency,
}: {
  category: CategoryWithActual;
  income: number;
  month: string;
  currency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(category.actual || ""));
  const [saving, setSaving] = useState(false);

  const isSavings = category.kind === "savings";
  const target = category.target_amount;
  const actual = category.actual;
  const ratio = target > 0 ? actual / target : actual > 0 ? 1 : 0;
  // Overspend only flagged for spending categories; savings over target is good.
  const overspent = !isSavings && target > 0 && actual > target;
  const targetPctIncome = percentOfIncome(target, income);
  const actualPctIncome = percentOfIncome(actual, income);

  async function save() {
    const amount = Number(draft);
    if (!isFinite(amount) || amount < 0) {
      setEditing(false);
      setDraft(String(actual || ""));
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/actuals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, category_id: category.id, amount }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${
        overspent
          ? "border-blush-300 bg-blush-100/50"
          : "border-lavender-200 bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {category.name}
            {isSavings && (
              <span className="ml-2 rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-sage-600">
                savings
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            Target {formatPercent(targetPctIncome)} ·{" "}
            {formatCurrency(target, currency)}
          </p>
        </div>

        <div className="text-right">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <span className="text-ink-faint">{currencySymbol(currency)}</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(String(actual || ""));
                  }
                }}
                className="w-24 rounded-lg border border-lavender-300 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-lavender-400"
              />
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-lavender-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-lavender-600 disabled:opacity-50"
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(String(actual || ""));
                setEditing(true);
              }}
              className="group text-right"
            >
              <span
                className={`block text-lg font-semibold tabular-nums ${
                  overspent ? "text-blush-700" : "text-ink"
                }`}
              >
                {formatCurrency(actual, currency)}
              </span>
              <span className="text-xs text-ink-faint group-hover:text-lavender-600">
                {formatPercent(actualPctIncome)} of income · tap to edit
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar ratio={ratio} overspent={overspent} savings={isSavings} />
        <span
          className={`w-12 shrink-0 text-right text-xs tabular-nums ${
            overspent ? "text-blush-700" : "text-ink-soft"
          }`}
        >
          {target > 0 ? formatPercent(ratio) : "—"}
        </span>
      </div>

      {overspent && (
        <p className="mt-2 text-xs text-blush-700">
          {formatCurrency(actual - target, currency)} over target — gently worth
          a look.
        </p>
      )}
    </div>
  );
}
