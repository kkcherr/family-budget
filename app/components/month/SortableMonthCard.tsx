"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CategoryWithActual, FREQUENCY_LABELS } from "@/lib/types";
import {
  currencySymbol,
  formatCurrency,
  formatPercent,
  percentOfIncome,
} from "@/lib/money";
import ProgressBar from "../ProgressBar";

/**
 * A month-view category card: draggable (to reorder, shared with the Plan) and
 * with an inline editor for the actual amount spent/saved this month.
 */
export default function SortableMonthCard({
  category,
  income,
  currency,
  onSaveActual,
}: {
  category: CategoryWithActual;
  income: number;
  currency: string;
  onSaveActual: (id: number, amount: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(category.id) });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(category.actual || ""));

  const isSavings = category.section === "savings";
  const target = category.target_amount;
  const actual = category.actual;
  const ratio = target > 0 ? actual / target : actual > 0 ? 1 : 0;
  const overspent = !isSavings && target > 0 && actual > target;
  const actualPctIncome = percentOfIncome(actual, income);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function commit() {
    const amount = Number(draft);
    if (!isFinite(amount) || amount < 0) {
      setEditing(false);
      setDraft(String(actual || ""));
      return;
    }
    onSaveActual(category.id, amount);
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-3 transition-colors ${
        overspent
          ? "border-terracotta-300 bg-terracotta-100/50"
          : "border-lavender-200 bg-surface"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="mt-0.5 cursor-grab touch-none px-0.5 text-lavender-400 hover:text-lavender-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {category.name}
            {isSavings && (
              <span className="ml-1.5 rounded-full bg-sage-100 px-1.5 py-0.5 text-[10px] font-medium text-sage-600">
                savings
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            Target {formatCurrency(target, currency)}
            {category.frequency !== "monthly" && (
              <span> · {FREQUENCY_LABELS[category.frequency].toLowerCase()}</span>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {editing ? (
            <div className="flex items-center gap-1">
              <span className="text-ink-faint">{currencySymbol(currency)}</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setDraft(String(actual || ""));
                  }
                }}
                className="w-20 rounded-lg border border-mist-200 bg-white px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400"
              />
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
                className={`block text-base font-semibold tabular-nums ${
                  overspent ? "text-terracotta-700" : "text-ink"
                }`}
              >
                {formatCurrency(actual, currency)}
              </span>
              <span className="text-[10px] text-ink-faint group-hover:text-lavender-600">
                {formatPercent(actualPctIncome)} · edit
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar ratio={ratio} overspent={overspent} savings={isSavings} />
        <span
          className={`w-10 shrink-0 text-right text-[11px] tabular-nums ${
            overspent ? "text-terracotta-700" : "text-ink-soft"
          }`}
        >
          {target > 0 ? formatPercent(ratio) : "—"}
        </span>
      </div>

      {overspent && (
        <p className="mt-1.5 text-[11px] text-terracotta-700">
          {formatCurrency(actual - target, currency)} over target
        </p>
      )}
    </div>
  );
}
