import { NextResponse } from "next/server";
import { archiveCategory, updateCategory } from "@/lib/queries";
import { CategoryGroup, CategoryKind, GROUP_ORDER } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: CategoryKind[] = ["spending", "savings"];

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
    group?: string;
    target_amount?: number;
    kind?: string;
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
  if (body.group !== undefined) {
    if (!GROUP_ORDER.includes(body.group as CategoryGroup))
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    patch.group = body.group as CategoryGroup;
  }
  if (body.kind !== undefined) {
    if (!KINDS.includes(body.kind as CategoryKind))
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    patch.kind = body.kind as CategoryKind;
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
