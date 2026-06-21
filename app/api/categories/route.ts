import { NextResponse } from "next/server";
import { applyLayout, createCategory, getCategories } from "@/lib/queries";
import {
  Frequency,
  FREQUENCY_ORDER,
  Section,
  SECTION_ORDER,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await getCategories(false);
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  let body: {
    name?: string;
    section?: string;
    col?: number;
    target_amount?: number;
    frequency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const section = body.section as Section;
  const col = Number(body.col ?? 0) === 1 ? 1 : 0;
  const target = Number(body.target_amount ?? 0);
  const frequency = (body.frequency as Frequency) ?? "monthly";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!SECTION_ORDER.includes(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }
  if (!FREQUENCY_ORDER.includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }
  if (!isFinite(target) || target < 0) {
    return NextResponse.json(
      { error: "target_amount must be a non-negative number" },
      { status: 400 }
    );
  }

  const category = await createCategory({
    name,
    section,
    col,
    target_amount: target,
    frequency,
  });
  return NextResponse.json(category, { status: 201 });
}

// Apply a new drag-and-drop layout: body { items: [{ id, section, col }] }.
export async function PATCH(req: Request) {
  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  const items: { id: number; section: Section; col: number }[] = [];
  for (const raw of body.items) {
    const id = Number((raw as { id?: unknown })?.id);
    const section = (raw as { section?: unknown })?.section as Section;
    const col = Number((raw as { col?: unknown })?.col) === 1 ? 1 : 0;
    if (!Number.isInteger(id) || !SECTION_ORDER.includes(section)) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }
    items.push({ id, section, col });
  }

  await applyLayout(items);
  return NextResponse.json({ ok: true });
}
