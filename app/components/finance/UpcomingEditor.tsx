"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UpcomingPayment, daysUntil } from "@/lib/finance-types";
import {
  currencySymbol,
  formatCurrency,
  formatDateStr,
  relativeDays,
} from "@/lib/money";

export default function UpcomingEditor({
  payments,
  currency,
}: {
  payments: UpcomingPayment[];
  currency: string;
}) {
  const router = useRouter();

  async function add() {
    await fetch("/api/upcoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New payment" }),
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
          📅 Upcoming big payments
        </h2>
        <button
          onClick={add}
          className="rounded-lg bg-lavender-100 px-2.5 py-1 text-sm font-medium text-lavender-700 hover:bg-lavender-200"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2.5">
        {payments.length === 0 && (
          <p className="card px-4 py-5 text-center text-sm text-ink-faint">
            Nothing planned yet.
          </p>
        )}
        {payments.map((p) => (
          <UpcomingRow key={p.id} payment={p} currency={currency} />
        ))}
      </div>
    </section>
  );
}

function UpcomingRow({
  payment,
  currency,
}: {
  payment: UpcomingPayment;
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(payment.name);
  const [amount, setAmount] = useState(String(payment.amount || ""));
  const [saved, setSaved] = useState(String(payment.saved_so_far || ""));
  const [confirming, setConfirming] = useState(false);

  const remaining = Math.max(payment.amount - payment.saved_so_far, 0);
  const progress =
    payment.amount > 0 ? Math.min(1, payment.saved_so_far / payment.amount) : 0;
  const dleft = daysUntil(payment.due_date);
  const monthsLeft = dleft !== null ? Math.max(1, Math.ceil(dleft / 30)) : null;
  const perMonth = monthsLeft ? remaining / monthsLeft : null;

  async function save(patch: Partial<UpcomingPayment>) {
    await fetch(`/api/upcoming/${payment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/upcoming/${payment.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== payment.name && save({ name: name.trim() })}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 font-medium text-ink outline-none focus:bg-lavender-50"
        />
        <button
          onClick={() => setConfirming((v) => !v)}
          aria-label="Remove"
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-terracotta-100 hover:text-terracotta-700"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-ink-soft">Cost</span>
          <span className="text-ink-faint">{currencySymbol(currency)}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => {
              const a = Number(amount);
              if (isFinite(a) && a >= 0 && a !== payment.amount) save({ amount: a });
            }}
            placeholder="0"
            className="w-24 rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-right tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-ink-soft">Saved</span>
          <span className="text-ink-faint">{currencySymbol(currency)}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
            onBlur={() => {
              const s = Number(saved);
              if (isFinite(s) && s >= 0 && s !== payment.saved_so_far)
                save({ saved_so_far: s });
            }}
            placeholder="0"
            className="w-24 rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-right tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-ink-soft">Due</span>
          <input
            type="date"
            value={payment.due_date ?? ""}
            onChange={(e) => save({ due_date: e.target.value || null })}
            className="rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-xs outline-none focus:border-lavender-400"
          />
        </label>
      </div>

      {payment.amount > 0 && (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-lavender-100">
            <div
              className="h-full rounded-full bg-sage-400 transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1.5 px-0.5 text-xs text-ink-soft">
            {remaining > 0 ? (
              <>
                <strong className="text-ink">
                  {formatCurrency(remaining, currency)}
                </strong>{" "}
                still to set aside
                {payment.due_date && dleft !== null && dleft >= 0 && (
                  <>
                    {" "}
                    · due {formatDateStr(payment.due_date)} ({relativeDays(dleft)})
                    {perMonth !== null && monthsLeft! > 1 && (
                      <> · ≈ {formatCurrency(perMonth, currency)}/mo</>
                    )}
                  </>
                )}
              </>
            ) : (
              <span className="text-sage-600">Fully set aside 🌿</span>
            )}
          </p>
        </>
      )}

      {confirming && (
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-terracotta-100 px-3 py-2">
          <span className="text-sm text-terracotta-700">Remove this payment?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2.5 py-1 text-sm text-ink-soft hover:bg-white"
            >
              Keep
            </button>
            <button
              onClick={remove}
              className="rounded-lg bg-terracotta-500 px-2.5 py-1 text-sm font-medium text-white hover:bg-terracotta-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
