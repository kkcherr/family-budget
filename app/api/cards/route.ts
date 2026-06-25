import { NextResponse } from "next/server";
import {
  createCreditCard,
  getCreditCards,
  reorderCreditCards,
} from "@/lib/finance";
import { parseIds } from "@/lib/reorder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCreditCards());
}

export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim() || "New card";
  return NextResponse.json(await createCreditCard(name), { status: 201 });
}

// Reorder: body { ids: number[] } in the new order.
export async function PATCH(req: Request) {
  const ids = await parseIds(req);
  if (!ids) return NextResponse.json({ error: "ids array required" }, { status: 400 });
  await reorderCreditCards(ids);
  return NextResponse.json({ ok: true });
}
