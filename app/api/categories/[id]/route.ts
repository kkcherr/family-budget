import { NextResponse } from "next/server";
import { archiveCategory, updateCategory } from "@/lib/queries";
import {
  Frequency,
  FREQUENCY_ORDER,
  Section,
  SECTION_ORDER,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: {
    name?: string;
    section?: string;
    col?: number;
    target_amount?: number;
    frequency?: string;
    archived?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Parameters<typeof updateCategory>[1] = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name)
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.section !== undefined) {
    if (!SECTION_ORDER.includes(body.section as Section))
      return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    patch.section = body.section as Section;
  }
  if (body.col !== undefined) {
    patch.col = Number(body.col) === 1 ? 1 : 0;
  }
  if (body.frequency !== undefined) {
    if (!FREQUENCY_ORDER.includes(body.frequency as Frequency))
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    patch.frequency = body.frequency as Frequency;
  }
  if (body.target_amount !== undefined) {
    const t = Number(body.target_amount);
    if (!isFinite(t) || t < 0)
      return NextResponse.json(
        { error: "target_amount must be a non-negative number" },
        { status: 400 }
      );
    patch.target_amount = t;
  }
  if (body.archived !== undefined) patch.archived = Boolean(body.archived);

  const updated = await updateCategory(categoryId, patch);
  if (!updated) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = Number(id);
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await archiveCategory(categoryId);
  return NextResponse.json({ ok: true });
}
