import { NextResponse } from "next/server";
import { upsertActual } from "@/lib/queries";
import { isValidMonth } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Overwrite the running total for a category in a month.
export async function PUT(req: Request) {
  let body: { month?: string; category_id?: number; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const month = String(body.month ?? "");
  const categoryId = Number(body.category_id);
  const amount = Number(body.amount);

  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  if (!Number.isInteger(categoryId)) {
    return NextResponse.json({ error: "Invalid category_id" }, { status: 400 });
  }
  if (!isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: "amount must be a non-negative number" },
      { status: 400 }
    );
  }

  await upsertActual(month, categoryId, amount);
  return NextResponse.json({ ok: true });
}
