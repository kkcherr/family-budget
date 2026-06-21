import { NextResponse } from "next/server";
import { archiveCreditCard, updateCreditCard, DueKind } from "@/lib/finance";
import { isValidDateStr } from "@/lib/finance-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUE_KINDS: DueKind[] = ["monthly_day", "fixed_date", "none"];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = Number(id);
  if (!Number.isInteger(cardId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Parameters<typeof updateCreditCard>[1] = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name)
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.balance !== undefined) {
    const b = Number(body.balance);
    if (!isFinite(b) || b < 0)
      return NextResponse.json({ error: "balance must be ≥ 0" }, { status: 400 });
    patch.balance = b;
  }
  if (body.due_kind !== undefined) {
    if (!DUE_KINDS.includes(body.due_kind as DueKind))
      return NextResponse.json({ error: "Invalid due_kind" }, { status: 400 });
    patch.due_kind = body.due_kind as DueKind;
  }
  if (body.due_day !== undefined) {
    if (body.due_day === null) patch.due_day = null;
    else {
      const d = Number(body.due_day);
      if (!Number.isInteger(d) || d < 1 || d > 28)
        return NextResponse.json(
          { error: "due_day must be 1–28" },
          { status: 400 }
        );
      patch.due_day = d;
    }
  }
  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === "") patch.due_date = null;
    else if (isValidDateStr(body.due_date)) patch.due_date = body.due_date;
    else
      return NextResponse.json({ error: "due_date must be a valid date" }, { status: 400 });
  }
  if (body.statement_day !== undefined) {
    if (body.statement_day === null) patch.statement_day = null;
    else {
      const d = Number(body.statement_day);
      if (!Number.isInteger(d) || d < 1 || d > 28)
        return NextResponse.json(
          { error: "statement_day must be 1–28" },
          { status: 400 }
        );
      patch.statement_day = d;
    }
  }
  if (body.note !== undefined) {
    patch.note = body.note === null ? null : String(body.note).slice(0, 200);
  }
  if (body.archived !== undefined) patch.archived = Boolean(body.archived);

  const updated = await updateCreditCard(cardId, patch);
  if (!updated)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = Number(id);
  if (!Number.isInteger(cardId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await archiveCreditCard(cardId);
  return NextResponse.json({ ok: true });
}
