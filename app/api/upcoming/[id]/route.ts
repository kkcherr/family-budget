import { NextResponse } from "next/server";
import {
  archiveUpcomingPayment,
  updateUpcomingPayment,
} from "@/lib/finance";
import { isValidDateStr } from "@/lib/finance-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payId = Number(id);
  if (!Number.isInteger(payId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Parameters<typeof updateUpcomingPayment>[1] = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name)
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.amount !== undefined) {
    const a = Number(body.amount);
    if (!isFinite(a) || a < 0)
      return NextResponse.json({ error: "amount must be ≥ 0" }, { status: 400 });
    patch.amount = a;
  }
  if (body.saved_so_far !== undefined) {
    const s = Number(body.saved_so_far);
    if (!isFinite(s) || s < 0)
      return NextResponse.json({ error: "saved_so_far must be ≥ 0" }, { status: 400 });
    patch.saved_so_far = s;
  }
  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === "") patch.due_date = null;
    else if (isValidDateStr(body.due_date)) patch.due_date = body.due_date;
    else
      return NextResponse.json({ error: "due_date must be a valid date" }, { status: 400 });
  }
  if (body.note !== undefined) {
    patch.note = body.note === null ? null : String(body.note).slice(0, 200);
  }
  if (body.archived !== undefined) patch.archived = Boolean(body.archived);

  const updated = await updateUpcomingPayment(payId, patch);
  if (!updated)
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payId = Number(id);
  if (!Number.isInteger(payId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await archiveUpcomingPayment(payId);
  return NextResponse.json({ ok: true });
}
