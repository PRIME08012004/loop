import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/dashboard-session";
import { getRazorpay, razorpayConfigured } from "@/lib/billing";
import { getPlan, isPaidPlan, type PlanId } from "@/lib/plans";
import prisma from "@/lib/db";

export const runtime = "nodejs";

const PAID: PlanId[] = ["BEGINNER", "ADVANCED", "PRO"];

function razorpayFailureMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Could not create a Razorpay order.";
  const record = error as {
    error?: { description?: string; reason?: string; code?: string };
    message?: string;
    statusCode?: number;
  };
  const description = record.error?.description || record.error?.reason || record.message;
  if (description) return String(description);
  if (record.statusCode === 401) return "Razorpay rejected the API keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.";
  return "Could not create a Razorpay order.";
}

export async function POST(request: Request) {
  try {
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
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    if (!keyId) {
      return NextResponse.json(
        { error: "Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
        { status: 503 },
      );
    }

    let order: { id: string };
    try {
      const razorpay = getRazorpay();
      order = await razorpay.orders.create({
        amount: definition.amountPaise,
        currency: definition.currency,
        receipt: `loop_${organizationId.slice(-8)}_${plan}_${Date.now()}`.slice(0, 40),
        notes: {
          organizationId,
          plan,
          userId,
        },
      });
    } catch (error) {
      console.error("Razorpay order create failed", error);
      return NextResponse.json({ error: razorpayFailureMessage(error) }, { status: 502 });
    }

    try {
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
    } catch (error) {
      console.error("Failed to persist Razorpay order", error);
      return NextResponse.json(
        {
          error:
            "Payment order was created in Razorpay, but saving it failed. Run database migrations (Payment table) and try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      keyId,
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
  } catch (error) {
    console.error("Billing create-order failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start checkout." },
      { status: 500 },
    );
  }
}
