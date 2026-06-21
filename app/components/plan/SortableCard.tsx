"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import {
  Category,
  Frequency,
  FREQUENCY_LABELS,
  FREQUENCY_ORDER,
  monthlyEquivalent,
} from "@/lib/types";
import { currencySymbol, formatCurrency, formatPercent, percentOfIncome } from "@/lib/money";

export default function SortableCard({
  category,
  income,
  currency,
  onChange,
  onRemove,
}: {
  category: Category;
  income: number;
  currency: string;
  onChange: (patch: Partial<Category>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(category.id) });

  const [name, setName] = useState(category.name);
  const [target, setTarget] = useState(String(category.target_amount || ""));
  const [confirming, setConfirming] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const monthly = monthlyEquivalent(category.target_amount, category.frequency);
  const pct = percentOfIncome(monthly, income);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-lavender-200 bg-surface p-3 shadow-soft-sm"
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="cursor-grab touch-none px-1 text-lavender-400 hover:text-lavender-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            name.trim() && name !== category.name && onChange({ name: name.trim() })
          }
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink outline-none focus:bg-lavender-50"
          placeholder="Name"
        />
        <button
          type="button"
          onClick={() => setConfirming((v) => !v)}
          aria-label="Remove"
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-blush-100 hover:text-blush-700"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-ink-faint">{currencySymbol(currency)}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onBlur={() => {
            const t = Number(target);
            if (isFinite(t) && t >= 0 && t !== category.target_amount)
              onChange({ target_amount: t });
          }}
          placeholder="0"
          className="w-20 rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
        />
        <select
          value={category.frequency}
          onChange={(e) => onChange({ frequency: e.target.value as Frequency })}
          className="min-w-0 flex-1 rounded-lg border border-lavender-200 bg-lavender-50 px-1.5 py-1 text-xs outline-none focus:border-lavender-400"
        >
          {FREQUENCY_ORDER.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {category.target_amount > 0 && (
        <p className="mt-1.5 px-1 text-[11px] text-ink-faint">
          {category.frequency === "monthly"
            ? `${formatPercent(pct)} of income`
            : `≈ ${formatCurrency(monthly, currency)}/mo · ${formatPercent(pct)} of income`}
        </p>
      )}

      {confirming && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-blush-100 px-2.5 py-1.5">
          <span className="text-xs text-blush-700">Remove?</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2 py-0.5 text-xs text-ink-soft hover:bg-white"
            >
              Keep
            </button>
            <button
              onClick={onRemove}
              className="rounded-lg bg-blush-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-blush-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
