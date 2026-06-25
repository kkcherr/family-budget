"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SavingsPot } from "@/lib/finance-types";
import { currencySymbol, formatCurrency, formatPercent } from "@/lib/money";
import { SortableList, SortableRow, useOrder } from "./Sortable";

export default function SavingsEditor({
  pots,
  currency,
}: {
  pots: SavingsPot[];
  currency: string;
}) {
  const router = useRouter();
  const total = pots.reduce((s, p) => s + p.balance, 0);

  const byId = Object.fromEntries(pots.map((p) => [p.id, p]));
  const [order, setOrder] = useOrder(pots.map((p) => p.id));
  async function onReorder(next: number[]) {
    setOrder(next);
    await fetch("/api/savings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next }),
    });
    router.refresh();
  }

  async function add() {
    await fetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New pot" }),
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sage-600">
          🌿 Savings
        </h2>
        <button
          onClick={add}
          className="rounded-lg bg-sage-100 px-2.5 py-1 text-sm font-medium text-sage-600 hover:bg-sage-400/30"
        >
          + Add
        </button>
      </div>

      {/* Overall total */}
      <div className="card mb-2.5 p-3.5 text-center">
        <p className="text-2xl font-semibold tabular-nums text-sage-600">
          {formatCurrency(total, currency)}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">Total saved</p>
      </div>

      {pots.length === 0 ? (
        <p className="card px-4 py-5 text-center text-sm text-ink-faint">No pots yet.</p>
      ) : (
        <SortableList ids={order} onReorder={onReorder}>
          {order.map((id) =>
            byId[id] ? (
              <SortableRow key={id} id={id}>
                <PotRow pot={byId[id]} currency={currency} total={total} />
              </SortableRow>
            ) : null
          )}
        </SortableList>
      )}
    </section>
  );
}

function PotRow({
  pot,
  currency,
  total,
}: {
  pot: SavingsPot;
  currency: string;
  total: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(pot.name);
  const [balance, setBalance] = useState(String(pot.balance || ""));
  const [confirming, setConfirming] = useState(false);
  const share = total > 0 ? pot.balance / total : 0;

  async function save(patch: Partial<SavingsPot>) {
    await fetch(`/api/savings/${pot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }
  async function remove() {
    await fetch(`/api/savings/${pot.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card flex items-center gap-2 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== pot.name && save({ name: name.trim() })}
        className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink outline-none focus:bg-lavender-50"
      />
      {pot.balance > 0 && (
        <span className="shrink-0 text-[11px] text-ink-faint">{formatPercent(share)}</span>
      )}
      <span className="text-ink-faint">{currencySymbol(currency)}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        onBlur={() => {
          const b = Number(balance);
          if (isFinite(b) && b !== pot.balance) save({ balance: b });
        }}
        placeholder="0"
        className="w-28 rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
      />
      {confirming ? (
        <div className="flex gap-1">
          <button onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 text-xs text-ink-soft hover:bg-lavender-100">
            Keep
          </button>
          <button onClick={remove} className="rounded-lg bg-terracotta-500 px-2 py-1 text-xs font-medium text-white hover:bg-terracotta-700">
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label="Remove pot"
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-terracotta-100 hover:text-terracotta-700"
        >
          ✕
        </button>
      )}
    </div>
  );
}
