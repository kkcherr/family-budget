import { NextResponse } from "next/server";
import { createCreditCard, getCreditCards } from "@/lib/finance";

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
