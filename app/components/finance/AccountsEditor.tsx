"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Account } from "@/lib/finance-types";
import { currencySymbol, formatCurrency } from "@/lib/money";
import { SortableList, SortableRow, useOrder } from "./Sortable";

export default function AccountsEditor({
  accounts,
  currency,
}: {
  accounts: Account[];
  currency: string;
}) {
  const router = useRouter();
  const totalCash = accounts.reduce((s, a) => s + a.balance, 0);

  const byId = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const [order, setOrder] = useOrder(accounts.map((a) => a.id));
  async function onReorder(next: number[]) {
    setOrder(next);
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next }),
    });
    router.refresh();
  }

  async function add() {
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New account" }),
    });
    router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lavender-700">
          🏦 Accounts &amp; cash
        </h2>
        <button
          onClick={add}
          className="rounded-lg bg-lavender-100 px-2.5 py-1 text-sm font-medium text-lavender-700 hover:bg-lavender-200"
        >
          + Add
        </button>
      </div>

      {/* Total cash */}
      <div className="card mb-2.5 p-3.5 text-center">
        <p className="text-2xl font-semibold tabular-nums text-ink">
          {formatCurrency(totalCash, currency)}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">Total in accounts</p>
      </div>

      {accounts.length === 0 ? (
        <p className="card px-4 py-5 text-center text-sm text-ink-faint">
          No accounts yet.
        </p>
      ) : (
        <SortableList ids={order} onReorder={onReorder}>
          {order.map((id) =>
            byId[id] ? (
              <SortableRow key={id} id={id}>
                <AccountRow account={byId[id]} currency={currency} />
              </SortableRow>
            ) : null
          )}
        </SortableList>
      )}
    </section>
  );
}

function AccountRow({ account, currency }: { account: Account; currency: string }) {
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(String(account.balance || ""));
  const [confirming, setConfirming] = useState(false);

  async function save(patch: Partial<Account>) {
    await fetch(`/api/accounts/${account.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="card flex items-center gap-2 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== account.name && save({ name: name.trim() })}
        className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink outline-none focus:bg-lavender-50"
      />
      <span className="text-ink-faint">{currencySymbol(currency)}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        onBlur={() => {
          const b = Number(balance);
          if (isFinite(b) && b !== account.balance) save({ balance: b });
        }}
        placeholder="0"
        className="w-24 rounded-lg border border-mist-200 bg-mist-100 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-lavender-400 focus:bg-white"
      />
      {confirming ? (
        <div className="flex gap-1">
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg px-2 py-1 text-xs text-ink-soft hover:bg-lavender-100"
          >
            Keep
          </button>
          <button
            onClick={remove}
            className="rounded-lg bg-terracotta-500 px-2 py-1 text-xs font-medium text-white hover:bg-terracotta-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label="Remove account"
          className="rounded-lg px-1.5 py-1 text-ink-faint hover:bg-terracotta-100 hover:text-terracotta-700"
        >
          ✕
        </button>
      )}
    </div>
  );
}
