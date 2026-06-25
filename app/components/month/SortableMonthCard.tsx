"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CategoryWithActual } from "@/lib/types";
import {
  currencySymbol,
  formatCurrency,
  formatPercent,
  percentOfIncome,
} from "@/lib/money";
import ProgressBar from "../ProgressBar";

/**
 * One item on the Month board. Draggable (shared ordering with everywhere).
 * - Fixed / Savings: a single carried amount (edits propagate forward).
 * - Variable: a carried budget plus the logged spend, with soft overspend.
 */
export default function SortableMonthCard({
  category,
  income,
  currency,
  onSaveValue,
  onSaveActual,
  onRename,
  onRemove,
}: {
  category: CategoryWithActual;
  income: number;
  currency: string;
  onSaveValue: (id: number, amount: number) => void;
  onSaveActual: (id: number, amount: number) => void;
  onRename: (id: number, name: string) => void;
  onRemove: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(category.id) });

  const [name, setName] = useState(category.name);
  const [value, setValue] = useState(String(category.planned || ""));
  const [actual, setActual] = useState(String(category.actual || ""));
  const [confirming, setConfirming] = useState(false);

  // Keep fields in sync when the resolved values change (e.g. month switch).
  useEffect(() => setValue(String(category.planned || "")), [category.planned]);
  useEffect(() => setActual(String(category.actual || "")), [category.actual]);

  const isVariable = category.section === "variable";
  const isSavings = category.section === "savings";
  const overspent = isVariable && category.planned > 0 && category.actual > category.planned;
  const ratio =
    category.planned > 0 ? category.actual / category.planned : category.actual > 0 ? 1 : 0;
  const sym = currencySymbol(currency);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const numClass =
    "w-full rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400 focus:bg-white";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border p-3 transition-colors ${
        overspent ? "border-terracotta-300 bg-terracotta-100/50" : "border-lavender-200 bg-surface"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none px-0.5 text-lavender-400 hover:text-lavender-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== category.name && onRename(category.id, name.trim())}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink outline-none focus:bg-lavender-50"
          placeholder="Name"
        />
        {isSavings && (
          <span className="rounded-full bg-sage-100 px-1.5 py-0.5 text-[10px] font-medium text-sage-600">
            saving
          </span>
        )}
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          aria-label="Remove"
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-terracotta-100 hover:text-terracotta-700"
        >
          ✕
        </button>
      </div>

      {isVariable ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-ink-soft">
                Budget
              </span>
              <div className="flex items-center gap-1">
                <span className="text-ink-faint">{sym}</span>
                <input
                  type="number" inputMode="decimal" min={0} step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={() => {
                    const v = Number(value);
                    if (isFinite(v) && v >= 0 && v !== category.planned) onSaveValue(category.id, v);
                  }}
                  placeholder="0" className={numClass}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-ink-soft">
                Spent
              </span>
              <div className="flex items-center gap-1">
                <span className="text-ink-faint">{sym}</span>
                <input
                  type="number" inputMode="decimal" min={0} step="0.01"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  onBlur={() => {
                    const v = Number(actual);
                    if (isFinite(v) && v >= 0 && v !== category.actual) onSaveActual(category.id, v);
                  }}
                  placeholder="0" className={numClass}
                />
              </div>
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar ratio={ratio} overspent={overspent} />
            <span
              className={`w-10 shrink-0 text-right text-[11px] tabular-nums ${
                overspent ? "text-terracotta-700" : "text-ink-soft"
              }`}
            >
              {category.planned > 0 ? formatPercent(ratio) : "—"}
            </span>
          </div>
        </>
      ) : (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-ink-faint">{sym}</span>
          <input
            type="number" inputMode="decimal" min={0} step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const v = Number(value);
              if (isFinite(v) && v >= 0 && v !== category.planned) onSaveValue(category.id, v);
            }}
            placeholder="0" className={numClass}
          />
          {income > 0 && category.planned > 0 && (
            <span className="shrink-0 text-[11px] text-ink-faint">
              {formatPercent(percentOfIncome(category.planned, income))}
            </span>
          )}
        </div>
      )}

      {confirming && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-terracotta-100 px-2.5 py-1.5">
          <span className="text-xs text-terracotta-700">Remove?</span>
          <div className="flex gap-1.5">
            <button onClick={() => setConfirming(false)} className="rounded-lg px-2 py-0.5 text-xs text-ink-soft hover:bg-white">
              Keep
            </button>
            <button onClick={() => onRemove(category.id)} className="rounded-lg bg-terracotta-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-terracotta-700">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
