"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Category,
  CategoryWithActual,
  Plan,
  SECTION_LABELS,
  Section,
} from "@/lib/types";
import { currencySymbol, formatCurrency, formatPercent, percentOfIncome } from "@/lib/money";
import { SECTION_BAND } from "@/lib/palette";
import SortableMonthCard from "./month/SortableMonthCard";
import {
  Layout,
  buildLayout,
  containerKey,
  findContainerOf,
  flattenLayout,
} from "./plan/types";

export default function MonthEditor({
  initialPlan,
  initialCategories,
  month,
}: {
  initialPlan: Plan;
  initialCategories: CategoryWithActual[];
  month: string;
}) {
  const currency = initialPlan.currency;

  const [plan, setPlan] = useState(initialPlan);
  const [incomeDraft, setIncomeDraft] = useState(String(initialPlan.monthly_income || ""));
  const [savingIncome, setSavingIncome] = useState(false);
  const income = plan.monthly_income;

  const [byId, setById] = useState<Record<number, CategoryWithActual>>(() =>
    Object.fromEntries(initialCategories.map((c) => [c.id, c]))
  );
  const [layout, setLayoutState] = useState<Layout>(() => buildLayout(initialCategories));
  const layoutRef = useRef<Layout>(layout);
  function setLayout(next: Layout) {
    layoutRef.current = next;
    setLayoutState(next);
  }
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tally = useMemo(() => {
    const all = Object.values(byId);
    const spent = all.filter((c) => c.section !== "savings").reduce((s, c) => s + c.actual, 0);
    const saved = all.filter((c) => c.section === "savings").reduce((s, c) => s + c.actual, 0);
    return { spent, saved };
  }, [byId]);

  // --- Income --------------------------------------------------------------
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
  const incomeChanged = Number(incomeDraft) !== income;

  // --- Item mutations ------------------------------------------------------
  // Carried value: Fixed/Savings amount, or Variable budget. Edits propagate forward.
  function saveValue(id: number, amount: number) {
    setById((prev) => {
      const c = prev[id];
      const actual = c.section === "variable" ? c.actual : amount;
      return { ...prev, [id]: { ...c, planned: amount, actual } };
    });
    fetch("/api/values", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, category_id: id, amount }),
    });
  }

  function saveActual(id: number, amount: number) {
    setById((prev) => ({ ...prev, [id]: { ...prev[id], actual: amount } }));
    fetch("/api/actuals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, category_id: id, amount }),
    });
  }

  function rename(id: number, name: string) {
    setById((prev) => ({ ...prev, [id]: { ...prev[id], name } }));
    fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function addCategory(section: Section) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New item", section, col: 0 }),
    });
    if (!res.ok) return;
    const created: Category = await res.json();
    setById((prev) => ({ ...prev, [created.id]: { ...created, planned: 0, actual: 0 } }));
    const key = containerKey(section, 0);
    setLayout({ ...layoutRef.current, [key]: [...(layoutRef.current[key] ?? []), created.id] });
  }

  function removeCategory(id: number) {
    const key = findContainerOf(layoutRef.current, String(id));
    if (key) {
      setLayout({ ...layoutRef.current, [key]: layoutRef.current[key].filter((x) => x !== id) });
    }
    setById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    fetch(`/api/categories/${id}`, { method: "DELETE" });
  }

  // --- Drag and drop -------------------------------------------------------
  function persist(next: Layout) {
    fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: flattenLayout(next) }),
    });
  }
  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeKey = findContainerOf(layoutRef.current, String(active.id));
    const overKey = findContainerOf(layoutRef.current, String(over.id));
    if (!activeKey || !overKey || activeKey === overKey) return;
    const cur = layoutRef.current;
    const activeItems = cur[activeKey];
    const overItems = cur[overKey];
    const movingId = Number(active.id);
    let overIndex = overItems.indexOf(Number(over.id));
    if (overIndex < 0) overIndex = overItems.length;
    setLayout({
      ...cur,
      [activeKey]: activeItems.filter((id) => id !== movingId),
      [overKey]: [...overItems.slice(0, overIndex), movingId, ...overItems.slice(overIndex)],
    });
  }
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return persist(layoutRef.current);
    const key = findContainerOf(layoutRef.current, String(active.id));
    const overKey = findContainerOf(layoutRef.current, String(over.id));
    if (key && overKey && key === overKey) {
      const items = layoutRef.current[key];
      const oldIndex = items.indexOf(Number(active.id));
      let newIndex = items.indexOf(Number(over.id));
      if (newIndex < 0) newIndex = items.length - 1;
      if (oldIndex !== newIndex && newIndex >= 0) {
        setLayout({ ...layoutRef.current, [key]: arrayMove(items, oldIndex, newIndex) });
      }
    }
    persist(layoutRef.current);
  }

  const activeCategory = activeId ? byId[Number(activeId)] : null;

  const cardProps = {
    income,
    currency,
    onSaveValue: saveValue,
    onSaveActual: saveActual,
    onRename: rename,
    onRemove: removeCategory,
  };

  return (
    <div className="space-y-6">
      {/* Income + month-to-date */}
      <section className="card p-5">
        <label className="label" htmlFor="income">
          Combined monthly income
        </label>
        <div className="flex items-center gap-2">
          <span className="text-ink-faint">{currencySymbol(currency)}</span>
          <input
            id="income" type="number" inputMode="decimal" min={0} step="0.01"
            value={incomeDraft}
            onChange={(e) => setIncomeDraft(e.target.value)}
            placeholder="0" className="input flex-1"
          />
          <button onClick={saveIncome} disabled={savingIncome || !incomeChanged} className="btn-primary">
            {savingIncome ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Pill label="Spent" value={formatCurrency(tally.spent, currency)} sub={formatPercent(percentOfIncome(tally.spent, income))} />
          <Pill label="Saved" value={formatCurrency(tally.saved, currency)} sub={formatPercent(percentOfIncome(tally.saved, income))} tone="sage" />
          <Pill label="Leftover" value={formatCurrency(Math.max(income - tally.spent - tally.saved, 0), currency)} />
        </div>
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock section="fixed" onAdd={() => addCategory("fixed")}>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((col) => (
                <Column key={col} id={containerKey("fixed", col)} layout={layout} byId={byId} {...cardProps} />
              ))}
            </div>
          </SectionBlock>

          <SectionBlock section="variable" onAdd={() => addCategory("variable")}>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((col) => (
                <Column key={col} id={containerKey("variable", col)} layout={layout} byId={byId} {...cardProps} />
              ))}
            </div>
          </SectionBlock>
        </div>

        <div className="mt-4">
          <SectionBlock section="savings" onAdd={() => addCategory("savings")}>
            <Column id={containerKey("savings", 0)} layout={layout} byId={byId} {...cardProps} />
          </SectionBlock>
        </div>

        <DragOverlay>
          {activeCategory ? (
            <div className="rounded-2xl border border-lavender-300 bg-white p-3 shadow-soft">
              <span className="text-sm font-medium text-ink">{activeCategory.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="pt-1 text-center text-xs text-ink-faint">
        Amounts carry into future months until you change them — a change here applies from this month
        onward, leaving earlier months as they were.
      </p>
    </div>
  );
}

function Pill({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "sage";
}) {
  return (
    <div className={`rounded-xl px-2 py-1.5 ${tone === "sage" ? "bg-sage-100" : "bg-lavender-100"}`}>
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
      {sub && <p className="text-[10px] text-ink-faint">{sub}</p>}
    </div>
  );
}

function SectionBlock({
  section,
  onAdd,
  children,
}: {
  section: Section;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const band = SECTION_BAND[section];
  return (
    <section className={`rounded-2xl border ${band.border} ${band.bg} p-4 shadow-soft-sm`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${band.text}`}>
          {SECTION_LABELS[section]}
        </h3>
        <button
          onClick={onAdd}
          className="rounded-lg bg-surface/70 px-2.5 py-1 text-sm font-medium text-ink-soft hover:bg-surface"
        >
          + Add
        </button>
      </div>
      {children}
    </section>
  );
}

function Column({
  id,
  layout,
  byId,
  income,
  currency,
  onSaveValue,
  onSaveActual,
  onRename,
  onRemove,
}: {
  id: string;
  layout: Layout;
  byId: Record<number, CategoryWithActual>;
  income: number;
  currency: string;
  onSaveValue: (id: number, amount: number) => void;
  onSaveActual: (id: number, amount: number) => void;
  onRename: (id: number, name: string) => void;
  onRemove: (id: number) => void;
}) {
  const ids = layout[id] ?? [];
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext items={ids.map(String)} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`flex min-h-[64px] flex-col gap-2 rounded-2xl p-1.5 transition-colors ${
          isOver ? "bg-white/70" : "bg-white/30"
        }`}
      >
        {ids.map((cid) =>
          byId[cid] ? (
            <SortableMonthCard
              key={cid}
              category={byId[cid]}
              income={income}
              currency={currency}
              onSaveValue={onSaveValue}
              onSaveActual={onSaveActual}
              onRename={onRename}
              onRemove={onRemove}
            />
          ) : null
        )}
        {ids.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-ink-faint">Drop here</p>
        )}
      </div>
    </SortableContext>
  );
}
