"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DueKind, daysUntil, nextDue } from "@/lib/finance-types";
import {
  currencySymbol,
  formatCurrency,
  formatDateStr,
  relativeDays,
} from "@/lib/money";

export default function CreditCardsEditor({
  cards,
  currency,
}: {
  cards: CreditCard[];
  currency: string;
}) {
  const router = useRouter();

  async function add() {
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New card" }),
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
          💳 Credit cards
        </h2>
        <button
          onClick={add}
          className="rounded-lg bg-lavender-100 px-2.5 py-1 text-sm font-medium text-lavender-700 hover:bg-lavender-200"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2.5">
        {cards.length === 0 && (
          <p className="card px-4 py-5 text-center text-sm text-ink-faint">
            No cards yet.
          </p>
        )}
        {cards.map((card) => (
          <CardRow key={card.id} card={card} currency={currency} />
        ))}
      </div>
    </section>
  );
}

function CardRow({ card, currency }: { card: CreditCard; currency: string }) {
  const router = useRouter();
  const [name, setName] = useState(card.name);
  const [balance, setBalance] = useState(String(card.balance || ""));
  const [confirming, setConfirming] = useState(false);

  const due = nextDue(card);
  const dleft = daysUntil(due);

  async function save(patch: Partial<CreditCard>) {
    await fetch(`/api/cards/${card.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== card.name && save({ name: name.trim() })}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 font-medium text-ink outline-none focus:bg-lavender-50"
        />
        <button
          onClick={() => setConfirming((v) => !v)}
          aria-label="Remove card"
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-blush-100 hover:text-blush-700"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-ink-soft">Balance</span>
          <span className="text-ink-faint">{currencySymbol(currency)}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            onBlur={() => {
              const b = Number(balance);
              if (isFinite(b) && b >= 0 && b !== card.balance) save({ balance: b });
            }}
            placeholder="0"
            className="w-24 rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
          />
        </label>

        <ScheduleControls card={card} onSave={save} />
      </div>

      {/* Pay-by callout */}
      {card.balance > 0 && due ? (
        <div className="mt-2.5 rounded-xl bg-lavender-100 px-3 py-2 text-sm text-lavender-700">
          Pay <strong>{formatCurrency(card.balance, currency)}</strong> by{" "}
          <strong>{formatDateStr(due)}</strong>
          {dleft !== null && (
            <span className="text-ink-faint"> · {relativeDays(dleft)}</span>
          )}
        </div>
      ) : (
        due && (
          <p className="mt-2 px-1 text-xs text-ink-faint">
            Next payment date {formatDateStr(due)}
          </p>
        )
      )}

      {card.note && (
        <p className="mt-1.5 px-1 text-[11px] text-ink-faint">{card.note}</p>
      )}

      {confirming && (
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-blush-100 px-3 py-2">
          <span className="text-sm text-blush-700">Remove this card?</span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2.5 py-1 text-sm text-ink-soft hover:bg-white"
            >
              Keep
            </button>
            <button
              onClick={remove}
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

function ScheduleControls({
  card,
  onSave,
}: {
  card: CreditCard;
  onSave: (patch: Partial<CreditCard>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={card.due_kind}
        onChange={(e) => {
          const due_kind = e.target.value as DueKind;
          // Sensible defaults when switching modes.
          if (due_kind === "monthly_day")
            onSave({ due_kind, due_day: card.due_day ?? 1 });
          else if (due_kind === "fixed_date") onSave({ due_kind });
          else onSave({ due_kind });
        }}
        className="rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1 text-xs outline-none focus:border-lavender-400"
      >
        <option value="monthly_day">Monthly on day</option>
        <option value="fixed_date">Fixed date</option>
        <option value="none">No schedule</option>
      </select>

      {card.due_kind === "monthly_day" && (
        <input
          type="number"
          min={1}
          max={28}
          value={card.due_day ?? 1}
          onChange={(e) => {
            const d = Number(e.target.value);
            if (Number.isInteger(d) && d >= 1 && d <= 28) onSave({ due_day: d });
          }}
          className="w-14 rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1 text-center text-xs tabular-nums outline-none focus:border-lavender-400"
        />
      )}

      {card.due_kind === "fixed_date" && (
        <input
          type="date"
          value={card.due_date ?? ""}
          onChange={(e) => onSave({ due_date: e.target.value || null })}
          className="rounded-lg border border-lavender-200 bg-lavender-50 px-2 py-1 text-xs outline-none focus:border-lavender-400"
        />
      )}
    </div>
  );
}
