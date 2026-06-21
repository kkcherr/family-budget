"use client";

import { useMemo, useState } from "react";
import {
  Category,
  CategoryGroup,
  CategoryKind,
  GROUP_LABELS,
  GROUP_ORDER,
  Plan,
} from "@/lib/types";
import { formatCurrency, formatPercent, percentOfIncome } from "@/lib/money";

export default function PlanEditor({
  initialPlan,
  initialCategories,
}: {
  initialPlan: Plan;
  initialCategories: Category[];
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [categories, setCategories] = useState(initialCategories);
  const [incomeDraft, setIncomeDraft] = useState(String(initialPlan.monthly_income));
  const [savingIncome, setSavingIncome] = useState(false);
  const currency = plan.currency;

  const income = plan.monthly_income;

  const totals = useMemo(() => {
    const targetTotal = categories.reduce((s, c) => s + c.target_amount, 0);
    const savingsTotal = categories
      .filter((c) => c.kind === "savings")
      .reduce((s, c) => s + c.target_amount, 0);
    return { targetTotal, savingsTotal };
  }, [categories]);

  async function saveIncome() {
    const value = Number(incomeDraft);
    if (!isFinite(value) || value < 0) return;
    setSavingIncome(true);
    try {
      const res = await fetch("/api/plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_income: value, currency }),
      });
      if (res.ok) setPlan(await res.json());
    } finally {
      setSavingIncome(false);
    }
  }

  async function updateCategory(id: number, patch: Partial<Category>) {
    // Optimistic local update, then persist.
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function addCategory(group: CategoryGroup) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New category",
        group,
        target_amount: 0,
        kind: group === "financial" ? "savings" : "spending",
      }),
    });
    if (res.ok) {
      const created: Category = await res.json();
      setCategories((prev) => [...prev, created]);
    }
  }

  async function removeCategory(id: number) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
  }

  async function move(id: number, dir: -1 | 1) {
    const ordered = [...categories];
    const i = ordered.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordered.length) return;
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    setCategories(ordered);
    await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ordered.map((c) => c.id) }),
    });
  }

  const incomeChanged = Number(incomeDraft) !== income;

  return (
    <div className="space-y-6">
      {/* Income */}
      <section className="card p-5">
        <label className="label" htmlFor="income">
          Combined monthly income
        </label>
        <div className="flex items-center gap-2">
          <span className="text-ink-faint">$</span>
          <input
            id="income"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={incomeDraft}
            onChange={(e) => setIncomeDraft(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={saveIncome}
            disabled={savingIncome || !incomeChanged}
            className="btn-primary"
          >
            {savingIncome ? "Saving…" : "Save"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Targets below total {formatCurrency(totals.targetTotal, currency)} (
          {formatPercent(percentOfIncome(totals.targetTotal, income))} of income).
          Planned savings: {formatCurrency(totals.savingsTotal, currency)} (
          {formatPercent(percentOfIncome(totals.savingsTotal, income))}).
        </p>
      </section>

      {/* Categories grouped */}
      {GROUP_ORDER.map((group) => {
        const items = categories.filter((c) => c.group === group);
        return (
          <section key={group} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
                {GROUP_LABELS[group]}
              </h3>
              <button
                onClick={() => addCategory(group)}
                className="text-sm font-medium text-lavender-600 hover:text-lavender-700"
              >
                + Add
              </button>
            </div>

            {items.length === 0 && (
              <p className="px-1 text-xs text-ink-faint">No categories yet.</p>
            )}

            {items.map((c, idx) => (
              <CategoryEditorRow
                key={c.id}
                category={c}
                income={income}
                currency={currency}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                onChange={(patch) => updateCategory(c.id, patch)}
                onRemove={() => removeCategory(c.id)}
                onMove={(dir) => move(c.id, dir)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function CategoryEditorRow({
  category,
  income,
  currency,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
}: {
  category: Category;
  income: number;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Category>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [name, setName] = useState(category.name);
  const [target, setTarget] = useState(String(category.target_amount));
  const [confirming, setConfirming] = useState(false);

  const pct = percentOfIncome(category.target_amount, income);

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            aria-label="Move up"
            disabled={isFirst}
            onClick={() => onMove(-1)}
            className="px-1 text-ink-faint hover:text-lavender-600 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            aria-label="Move down"
            disabled={isLast}
            onClick={() => onMove(1)}
            className="px-1 text-ink-faint hover:text-lavender-600 disabled:opacity-30"
          >
            ▼
          </button>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== category.name && onChange({ name: name.trim() })}
          className="input flex-1"
          placeholder="Category name"
        />

        <button
          onClick={() => setConfirming((v) => !v)}
          aria-label="Remove category"
          className="rounded-lg px-2 py-1 text-ink-faint hover:bg-blush-100 hover:text-blush-700"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-ink-faint">$</span>
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
            className="w-28 rounded-lg border border-lavender-200 bg-lavender-50 px-2.5 py-1.5 text-right tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
          />
        </div>

        <span className="rounded-full bg-lavender-100 px-2.5 py-1 text-xs font-medium text-lavender-700">
          {formatPercent(pct)} of income
        </span>

        <select
          value={category.kind}
          onChange={(e) => onChange({ kind: e.target.value as CategoryKind })}
          className="rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1.5 text-xs outline-none focus:border-lavender-400"
        >
          <option value="spending">Spending</option>
          <option value="savings">Savings</option>
        </select>

        <select
          value={category.group}
          onChange={(e) =>
            onChange({ group: e.target.value as CategoryGroup })
          }
          className="rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1.5 text-xs outline-none focus:border-lavender-400"
        >
          {GROUP_ORDER.map((g) => (
            <option key={g} value={g}>
              {GROUP_LABELS[g]}
            </option>
          ))}
        </select>
      </div>

      {confirming && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-blush-100 px-3 py-2">
          <span className="text-sm text-blush-700">Remove this category?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2.5 py-1 text-sm text-ink-soft hover:bg-white"
            >
              Keep
            </button>
            <button
              onClick={onRemove}
              className="rounded-lg bg-blush-500 px-2.5 py-1 text-sm font-medium text-white hover:bg-blush-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
