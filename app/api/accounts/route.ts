import { NextResponse } from "next/server";
import { createAccount, getAccounts, reorderAccounts } from "@/lib/finance";
import { parseIds } from "@/lib/reorder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAccounts());
}

export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim() || "New account";
  return NextResponse.json(await createAccount(name), { status: 201 });
}

export async function PATCH(req: Request) {
  const ids = await parseIds(req);
  if (!ids) return NextResponse.json({ error: "ids array required" }, { status: 400 });
  await reorderAccounts(ids);
  return NextResponse.json({ ok: true });
}
