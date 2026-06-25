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
  Plan,
  Section,
  monthlyEquivalent,
} from "@/lib/types";
import { currencySymbol, formatCurrency, formatPercent, percentOfIncome } from "@/lib/money";
import { SECTION_BAND } from "@/lib/palette";
import SortableCard from "./plan/SortableCard";
import {
  Layout,
  buildLayout,
  containerKey,
  findContainerOf,
  flattenLayout,
} from "./plan/types";

export default function PlanEditor({
  initialPlan,
  initialCategories,
}: {
  initialPlan: Plan;
  initialCategories: Category[];
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [incomeDraft, setIncomeDraft] = useState(String(initialPlan.monthly_income || ""));
  const [savingIncome, setSavingIncome] = useState(false);
  const currency = plan.currency;
  const income = plan.monthly_income;

  const [byId, setById] = useState<Record<number, Category>>(() =>
    Object.fromEntries(initialCategories.map((c) => [c.id, c]))
  );
  const [layout, setLayoutState] = useState<Layout>(() =>
    buildLayout(initialCategories)
  );
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

  // --- Derived summary -----------------------------------------------------
  const totals = useMemo(() => {
    const all = Object.values(byId).filter((c) => !c.archived);
    const sum = (section: Section) =>
      all
        .filter((c) => c.section === section)
        .reduce((s, c) => s + monthlyEquivalent(c.target_amount, c.frequency), 0);
    const fixed = sum("fixed");
    const variable = sum("variable");
    const savings = sum("savings");
    return { fixed, variable, savings, spend: fixed + variable };
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

  // --- Category mutations ---------------------------------------------------
  async function updateField(id: number, patch: Partial<Category>) {
    setById((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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
    setById((prev) => ({ ...prev, [created.id]: created }));
    const key = containerKey(section, 0);
    setLayout({ ...layoutRef.current, [key]: [...(layoutRef.current[key] ?? []), created.id] });
  }

  async function removeCategory(id: number) {
    const key = findContainerOf(layoutRef.current, String(id));
    if (key) {
      setLayout({
        ...layoutRef.current,
        [key]: layoutRef.current[key].filter((x) => x !== id),
      });
    }
    setById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
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
    if (overIndex < 0) overIndex = overItems.length; // dropped on the column itself

    setLayout({
      ...cur,
      [activeKey]: activeItems.filter((id) => id !== movingId),
      [overKey]: [
        ...overItems.slice(0, overIndex),
        movingId,
        ...overItems.slice(overIndex),
      ],
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      persist(layoutRef.current);
      return;
    }
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
  const incomeChanged = Number(incomeDraft) !== income;

  return (
    <div className="space-y-6">
      {/* Income */}
      <section className="card p-5">
        <label className="label" htmlFor="income">
          Combined monthly income
        </label>
        <div className="flex items-center gap-2">
          <span className="text-ink-faint">{currencySymbol(currency)}</span>
          <input
            id="income"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={incomeDraft}
            onChange={(e) => setIncomeDraft(e.target.value)}
            placeholder="0"
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
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <SummaryPill label="Fixed" value={formatCurrency(totals.fixed, currency)} sub={formatPercent(percentOfIncome(totals.fixed, income))} />
          <SummaryPill label="Variable" value={formatCurrency(totals.variable, currency)} sub={formatPercent(percentOfIncome(totals.variable, income))} />
          <SummaryPill label="Savings" value={formatCurrency(totals.savings, currency)} sub={formatPercent(percentOfIncome(totals.savings, income))} tone="sage" />
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          Monthly-equivalent of your targets. Items paid less often are averaged across the year.
        </p>
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Fixed + Variable side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock
            title="Fixed expenses"
            section="fixed"
            onAdd={() => addCategory("fixed")}
          >
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((col) => (
                <Column
                  key={col}
                  id={containerKey("fixed", col)}
                  layout={layout}
                  byId={byId}
                  income={income}
                  currency={currency}
                  onChange={updateField}
                  onRemove={removeCategory}
                />
              ))}
            </div>
          </SectionBlock>

          <SectionBlock
            title="Variable expenses"
            section="variable"
            onAdd={() => addCategory("variable")}
          >
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((col) => (
                <Column
                  key={col}
                  id={containerKey("variable", col)}
                  layout={layout}
                  byId={byId}
                  income={income}
                  currency={currency}
                  onChange={updateField}
                  onRemove={removeCategory}
                />
              ))}
            </div>
          </SectionBlock>
        </div>

        {/* Savings */}
        <div className="mt-4">
          <SectionBlock title="Savings" section="savings" onAdd={() => addCategory("savings")}>
            <Column
              id={containerKey("savings", 0)}
              layout={layout}
              byId={byId}
              income={income}
              currency={currency}
              onChange={updateField}
              onRemove={removeCategory}
            />
          </SectionBlock>
        </div>

        <DragOverlay>
          {activeCategory ? (
            <div className="rounded-2xl border border-lavender-300 bg-white p-3 shadow-soft">
              <span className="text-sm font-medium text-ink">
                {activeCategory.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "sage";
}) {
  return (
    <div className={`rounded-xl px-2 py-1.5 ${tone === "sage" ? "bg-sage-100" : "bg-lavender-100"}`}>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[10px] text-ink-faint">{sub}</p>
    </div>
  );
}

function SectionBlock({
  title,
  section,
  onAdd,
  children,
}: {
  title: string;
  section: Section;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const band = SECTION_BAND[section];
  return (
    <section className={`rounded-2xl border ${band.border} ${band.bg} p-4 shadow-soft-sm`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${band.text}`}>
          {title}
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
  onChange,
  onRemove,
}: {
  id: string;
  layout: Layout;
  byId: Record<number, Category>;
  income: number;
  currency: string;
  onChange: (id: number, patch: Partial<Category>) => void;
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
            <SortableCard
              key={cid}
              category={byId[cid]}
              income={income}
              currency={currency}
              onChange={(patch) => onChange(cid, patch)}
              onRemove={() => onRemove(cid)}
            />
          ) : null
        )}
        {ids.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-ink-faint">
            Drop here
          </p>
        )}
      </div>
    </SortableContext>
  );
}
