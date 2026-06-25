import { NextResponse } from "next/server";
import {
  createUpcomingPayment,
  getUpcomingPayments,
  reorderUpcomingPayments,
} from "@/lib/finance";
import { parseIds } from "@/lib/reorder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getUpcomingPayments());
}

export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim() || "New payment";
  return NextResponse.json(await createUpcomingPayment(name), { status: 201 });
}

export async function PATCH(req: Request) {
  const ids = await parseIds(req);
  if (!ids) return NextResponse.json({ error: "ids array required" }, { status: 400 });
  await reorderUpcomingPayments(ids);
  return NextResponse.json({ ok: true });
}
