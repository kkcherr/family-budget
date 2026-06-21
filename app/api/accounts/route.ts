import { NextResponse } from "next/server";
import { createAccount, getAccounts } from "@/lib/finance";

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
