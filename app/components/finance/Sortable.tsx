"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** A vertical drag-reorderable list keyed by numeric ids. */
export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: number[];
  onReorder: (ids: number[]) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = ids.indexOf(Number(active.id));
    const newI = ids.indexOf(Number(over.id));
    if (oldI < 0 || newI < 0) return;
    onReorder(arrayMove(ids, oldI, newI));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids.map(String)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

/** Wraps a row with a drag handle on the left. */
export function SortableRow({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      <button
        type="button"
        aria-label="Drag to reorder"
        className="mt-3 cursor-grab touch-none px-0.5 text-lavender-400 hover:text-lavender-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Keep a local id order that resyncs when the server order changes. */
export function useOrder(ids: number[]): [number[], (ids: number[]) => void] {
  const [order, setOrder] = useState<number[]>(ids);
  const key = ids.join(",");
  useEffect(() => setOrder(ids), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [order, setOrder];
}
