import { NextResponse } from "next/server";
import { archiveAccount, updateAccount } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { name?: unknown; balance?: unknown; archived?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: { name?: string; balance?: number; archived?: boolean } = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name)
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    patch.name = name;
  }
  if (body.balance !== undefined) {
    const b = Number(body.balance);
    if (!isFinite(b))
      return NextResponse.json({ error: "balance must be a number" }, { status: 400 });
    patch.balance = b;
  }
  if (body.archived !== undefined) patch.archived = Boolean(body.archived);

  const updated = await updateAccount(accountId, patch);
  if (!updated)
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accountId = Number(id);
  if (!Number.isInteger(accountId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await archiveAccount(accountId);
  return NextResponse.json({ ok: true });
}
