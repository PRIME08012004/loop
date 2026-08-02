import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/dashboard-session";
import { getRazorpay, razorpayConfigured } from "@/lib/billing";
import { getPlan, isPaidPlan, type PlanId } from "@/lib/plans";
import prisma from "@/lib/db";

export const runtime = "nodejs";

const PAID: PlanId[] = ["BEGINNER", "ADVANCED", "PRO"];

export async function POST(request: Request) {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  if (result.ctx.orgRole !== "OWNER") {
    return NextResponse.json({ error: "Only workspace owners can manage billing." }, { status: 403 });
  }

  if (!razorpayConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { plan?: unknown };
  const plan = typeof body.plan === "string" ? (body.plan.toUpperCase() as PlanId) : null;
  if (!plan || !PAID.includes(plan) || !isPaidPlan(plan)) {
    return NextResponse.json({ error: "Choose Beginner, Advanced, or Pro." }, { status: 400 });
  }

  const definition = getPlan(plan);
  const { organizationId, organizationName, userEmail, userId } = result.ctx;

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: definition.amountPaise,
    currency: definition.currency,
    receipt: `loop_${organizationId.slice(-8)}_${plan}_${Date.now()}`.slice(0, 40),
    notes: {
      organizationId,
      plan,
      userId,
    },
  });

  await prisma.payment.create({
    data: {
      organizationId,
      plan,
      amountPaise: definition.amountPaise,
      currency: definition.currency,
      status: "CREATED",
      razorpayOrderId: order.id,
    },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { razorpayOrderId: order.id },
  });

  return NextResponse.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: definition.amountPaise,
    currency: definition.currency,
    plan: definition.id,
    planName: definition.name,
    organizationName,
    prefill: {
      name: result.ctx.userName,
      email: userEmail ?? undefined,
    },
  });
}
