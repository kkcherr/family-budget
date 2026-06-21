import { Category, Section } from "@/lib/types";

/** Ordered ids per container, keyed by `${section}:${col}`. */
export type Layout = Record<string, number[]>;

export const CONTAINER_KEYS = [
  "fixed:0",
  "fixed:1",
  "variable:0",
  "variable:1",
  "savings:0",
] as const;

export function containerKey(section: Section, col: number): string {
  return `${section}:${col}`;
}

export function parseContainer(key: string): { section: Section; col: number } {
  const [section, col] = key.split(":");
  return { section: section as Section, col: Number(col) };
}

/** Build the per-container ordered-id layout from a flat category list. */
export function buildLayout(categories: Category[]): Layout {
  const layout: Layout = {};
  for (const key of CONTAINER_KEYS) layout[key] = [];
  for (const c of categories) {
    const key = containerKey(c.section, c.col);
    (layout[key] ??= []).push(c.id);
  }
  return layout;
}

/** Flatten a layout to the ordered [{id, section, col}] the API expects. */
export function flattenLayout(
  layout: Layout
): { id: number; section: Section; col: number }[] {
  const out: { id: number; section: Section; col: number }[] = [];
  for (const key of CONTAINER_KEYS) {
    const { section, col } = parseContainer(key);
    for (const id of layout[key] ?? []) out.push({ id, section, col });
  }
  return out;
}

/** Which container currently holds an id (or the key itself if it's a container). */
export function findContainerOf(layout: Layout, id: string): string | null {
  if ((CONTAINER_KEYS as readonly string[]).includes(id)) return id;
  const numId = Number(id);
  for (const key of CONTAINER_KEYS) {
    if ((layout[key] ?? []).includes(numId)) return key;
  }
  return null;
}
