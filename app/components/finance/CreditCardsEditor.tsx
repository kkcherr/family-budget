"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  DueKind,
  amountDue,
  daysUntil,
  lastStatementClose,
  nextDue,
  totalOwed,
} from "@/lib/finance-types";
import {
  currencySymbol,
  formatCurrency,
  formatDateStr,
  relativeDays,
} from "@/lib/money";
import { SortableList, SortableRow, useOrder } from "./Sortable";

export default function CreditCardsEditor({
  cards,
  currency,
}: {
  cards: CreditCard[];
  currency: string;
}) {
  const router = useRouter();
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const [order, setOrder] = useOrder(cards.map((c) => c.id));

  async function onReorder(next: number[]) {
    setOrder(next);
    await fetch("/api/cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next }),
    });
    router.refresh();
  }

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
      {cards.length === 0 ? (
        <p className="card px-4 py-5 text-center text-sm text-ink-faint">No cards yet.</p>
      ) : (
        <SortableList ids={order} onReorder={onReorder}>
          {order.map((id) =>
            byId[id] ? (
              <SortableRow key={id} id={id}>
                <CardRow card={byId[id]} currency={currency} />
              </SortableRow>
            ) : null
          )}
        </SortableList>
      )}
    </section>
  );
}

function CardRow({ card, currency }: { card: CreditCard; currency: string }) {
  const router = useRouter();
  const [name, setName] = useState(card.name);
  const [balance, setBalance] = useState(String(card.balance || ""));
  const [stmt, setStmt] = useState(String(card.statement_balance || ""));
  const [confirming, setConfirming] = useState(false);

  const isStatement = card.due_kind === "statement";
  const due = nextDue(card);
  const dleft = daysUntil(due);
  const payAmount = amountDue(card);
  const sym = currencySymbol(currency);
  const numCls =
    "w-24 rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400 focus:bg-white";

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
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-terracotta-100 hover:text-terracotta-700"
        >
          ✕
        </button>
      </div>

      <div className="mt-2">
        <ScheduleControls card={card} onSave={save} />
      </div>

      {/* Amounts */}
      {isStatement ? (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-ink-soft">
              Statement to pay
            </span>
            <div className="flex items-center gap-1">
              <span className="text-ink-faint">{sym}</span>
              <input
                type="number" inputMode="decimal" min={0} step="0.01"
                value={stmt}
                onChange={(e) => setStmt(e.target.value)}
                onBlur={() => {
                  const v = Number(stmt);
                  if (isFinite(v) && v >= 0 && v !== card.statement_balance)
                    save({ statement_balance: v });
                }}
                placeholder="0" className={numCls}
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-ink-soft">
              Accruing now
            </span>
            <div className="flex items-center gap-1">
              <span className="text-ink-faint">{sym}</span>
              <input
                type="number" inputMode="decimal" min={0} step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                onBlur={() => {
                  const v = Number(balance);
                  if (isFinite(v) && v >= 0 && v !== card.balance) save({ balance: v });
                }}
                placeholder="0" className={numCls}
              />
            </div>
          </label>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="text-xs text-ink-soft">Balance</span>
          <span className="text-ink-faint">{sym}</span>
          <input
            type="number" inputMode="decimal" min={0} step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            onBlur={() => {
              const v = Number(balance);
              if (isFinite(v) && v >= 0 && v !== card.balance) save({ balance: v });
            }}
            placeholder="0" className={numCls}
          />
        </div>
      )}

      {/* Pay-by callout */}
      {payAmount > 0 && due ? (
        <div className="mt-2.5 rounded-xl bg-lavender-100 px-3 py-2 text-sm text-lavender-700">
          Pay <strong>{formatCurrency(payAmount, currency)}</strong> by{" "}
          <strong>{formatDateStr(due)}</strong>
          {dleft !== null && <span className="text-ink-faint"> · {relativeDays(dleft)}</span>}
        </div>
      ) : (
        due && (
          <p className="mt-2 px-1 text-xs text-ink-faint">Next payment {formatDateStr(due)}</p>
        )
      )}

      {isStatement && card.statement_day && (
        <p className="mt-1.5 px-1 text-[11px] text-ink-faint">
          Statement closes on the {ordinal(card.statement_day)} (last close{" "}
          {formatDateStr(lastStatementClose(card.statement_day))}). Total owed{" "}
          {formatCurrency(totalOwed(card), currency)}.
        </p>
      )}

      {card.note && <p className="mt-1.5 px-1 text-[11px] text-ink-faint">{card.note}</p>}

      {confirming && (
        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-terracotta-100 px-3 py-2">
          <span className="text-sm text-terracotta-700">Remove this card?</span>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="rounded-lg px-2.5 py-1 text-sm text-ink-soft hover:bg-white">
              Keep
            </button>
            <button onClick={remove} className="rounded-lg bg-terracotta-500 px-2.5 py-1 text-sm font-medium text-white hover:bg-terracotta-700">
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
  const dayCls =
    "w-14 rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-center text-xs tabular-nums outline-none focus:border-lavender-400";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={card.due_kind}
        onChange={(e) => {
          const due_kind = e.target.value as DueKind;
          if (due_kind === "monthly_day") onSave({ due_kind, due_day: card.due_day ?? 1 });
          else if (due_kind === "statement")
            onSave({ due_kind, due_day: card.due_day ?? 5, statement_day: card.statement_day ?? 15 });
          else onSave({ due_kind });
        }}
        className="rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-xs outline-none focus:border-lavender-400"
      >
        <option value="monthly_day">Monthly on day</option>
        <option value="statement">Statement → next month</option>
        <option value="fixed_date">Fixed date</option>
        <option value="none">No schedule</option>
      </select>

      {card.due_kind === "monthly_day" && (
        <input
          type="number" min={1} max={28} value={card.due_day ?? 1}
          onChange={(e) => {
            const d = Number(e.target.value);
            if (Number.isInteger(d) && d >= 1 && d <= 28) onSave({ due_day: d });
          }}
          className={dayCls} aria-label="Day of month"
        />
      )}

      {card.due_kind === "statement" && (
        <>
          <label className="flex items-center gap-1 text-[11px] text-ink-soft">
            closes
            <input
              type="number" min={1} max={28} value={card.statement_day ?? 15}
              onChange={(e) => {
                const d = Number(e.target.value);
                if (Number.isInteger(d) && d >= 1 && d <= 28) onSave({ statement_day: d });
              }}
              className={dayCls} aria-label="Statement close day"
            />
          </label>
          <label className="flex items-center gap-1 text-[11px] text-ink-soft">
            pay
            <input
              type="number" min={1} max={28} value={card.due_day ?? 5}
              onChange={(e) => {
                const d = Number(e.target.value);
                if (Number.isInteger(d) && d >= 1 && d <= 28) onSave({ due_day: d });
              }}
              className={dayCls} aria-label="Payment day next month"
            />
          </label>
        </>
      )}

      {card.due_kind === "fixed_date" && (
        <input
          type="date" value={card.due_date ?? ""}
          onChange={(e) => onSave({ due_date: e.target.value || null })}
          className="rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-xs outline-none focus:border-lavender-400"
        />
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
