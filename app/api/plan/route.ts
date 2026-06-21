import { NextResponse } from "next/server";
import { getPlan, updatePlan } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const plan = await getPlan();
  return NextResponse.json(plan);
}

export async function PUT(req: Request) {
  let body: { monthly_income?: number; currency?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const income = Number(body.monthly_income);
  if (!isFinite(income) || income < 0) {
    return NextResponse.json(
      { error: "monthly_income must be a non-negative number" },
      { status: 400 }
    );
  }
  const currency =
    typeof body.currency === "string" && body.currency.length === 3
      ? body.currency.toUpperCase()
      : "USD";

  const plan = await updatePlan(income, currency);
  return NextResponse.json(plan);
}
