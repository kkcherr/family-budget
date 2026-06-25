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
import { CategoryWithActual, SECTION_LABELS, Section } from "@/lib/types";
import { formatCurrency, formatPercent, percentOfIncome } from "@/lib/money";
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
  initialCategories,
  income,
  currency,
  month,
}: {
  initialCategories: CategoryWithActual[];
  income: number;
  currency: string;
  month: string;
}) {
  const [byId, setById] = useState<Record<number, CategoryWithActual>>(() =>
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

  // Live month-to-date tallies from the in-memory actuals.
  const tally = useMemo(() => {
    const all = Object.values(byId);
    const spent = all
      .filter((c) => c.section !== "savings")
      .reduce((s, c) => s + c.actual, 0);
    const saved = all
      .filter((c) => c.section === "savings")
      .reduce((s, c) => s + c.actual, 0);
    return { spent, saved };
  }, [byId]);

  async function saveActual(id: number, amount: number) {
    setById((prev) => ({ ...prev, [id]: { ...prev[id], actual: amount } }));
    await fetch("/api/actuals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, category_id: id, amount }),
    });
  }

  // --- Drag and drop (shared ordering with the Plan) -----------------------
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

  return (
    <div className="space-y-6">
      {/* Month-to-date tallies */}
      <section className="grid grid-cols-3 gap-2 text-center">
        <Tally label="Spent" value={formatCurrency(tally.spent, currency)} />
        <Tally label="Saved" value={formatCurrency(tally.saved, currency)} tone="sage" />
        <Tally
          label="of income"
          value={formatPercent(percentOfIncome(tally.spent, income))}
        />
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionBlock section="fixed">
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((col) => (
                <Column
                  key={col}
                  id={containerKey("fixed", col)}
                  layout={layout}
                  byId={byId}
                  income={income}
                  currency={currency}
                  onSaveActual={saveActual}
                />
              ))}
            </div>
          </SectionBlock>

          <SectionBlock section="variable">
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((col) => (
                <Column
                  key={col}
                  id={containerKey("variable", col)}
                  layout={layout}
                  byId={byId}
                  income={income}
                  currency={currency}
                  onSaveActual={saveActual}
                />
              ))}
            </div>
          </SectionBlock>
        </div>

        <div className="mt-4">
          <SectionBlock section="savings">
            <Column
              id={containerKey("savings", 0)}
              layout={layout}
              byId={byId}
              income={income}
              currency={currency}
              onSaveActual={saveActual}
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

      <p className="pt-1 text-center text-xs text-ink-faint">
        Tap an amount to update it · drag the handle to reorder (shared with your plan).
      </p>
    </div>
  );
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "sage";
}) {
  return (
    <div className={`rounded-xl px-2 py-2 ${tone === "sage" ? "bg-sage-100" : "bg-lavender-100"}`}>
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function SectionBlock({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const band = SECTION_BAND[section];
  return (
    <section className={`rounded-2xl border ${band.border} ${band.bg} p-4 shadow-soft-sm`}>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${band.text}`}>
        {SECTION_LABELS[section]}
      </h3>
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
  onSaveActual,
}: {
  id: string;
  layout: Layout;
  byId: Record<number, CategoryWithActual>;
  income: number;
  currency: string;
  onSaveActual: (id: number, amount: number) => void;
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
              onSaveActual={onSaveActual}
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
