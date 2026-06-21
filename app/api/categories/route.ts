import { NextResponse } from "next/server";
import { createCategory, getCategories, reorderCategories } from "@/lib/queries";
import { CategoryGroup, CategoryKind, GROUP_ORDER } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: CategoryKind[] = ["spending", "savings"];

export async function GET() {
  const categories = await getCategories(false);
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  let body: {
    name?: string;
    group?: string;
    target_amount?: number;
    kind?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const group = body.group as CategoryGroup;
  const target = Number(body.target_amount ?? 0);
  const kind = (body.kind as CategoryKind) ?? "spending";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!GROUP_ORDER.includes(group)) {
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (!isFinite(target) || target < 0) {
    return NextResponse.json(
      { error: "target_amount must be a non-negative number" },
      { status: 400 }
    );
  }

  const category = await createCategory({
    name,
    group,
    target_amount: target,
    kind,
  });
  return NextResponse.json(category, { status: 201 });
}

// Reorder categories: body { ids: number[] } in desired order.
export async function PATCH(req: Request) {
  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((n) => Number.isInteger(n))
    : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  await reorderCategories(ids);
  return NextResponse.json({ ok: true });
}
