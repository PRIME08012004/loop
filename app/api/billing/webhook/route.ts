import { NextResponse } from "next/server";
import { activatePlan, verifyWebhookSignature } from "@/lib/billing";
import { isPaidPlan, type PlanId } from "@/lib/plans";
import prisma from "@/lib/db";

export const runtime = "nodejs";

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        notes?: Record<string, string>;
        amount?: number;
      };
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: payload.event ?? "unknown" });
  }

  const entity = payload.payload?.payment?.entity;
  const orderId = entity?.order_id;
  const paymentId = entity?.id;
  if (!orderId || !paymentId) {
    return NextResponse.json({ ok: true, skipped: "missing ids" });
  }

  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
  if (!payment) {
    return NextResponse.json({ ok: true, skipped: "unknown order" });
  }

  if (payment.status === "PAID") {
    return NextResponse.json({ ok: true, already: true });
  }

  const notePlan = entity?.notes?.plan?.toUpperCase() as PlanId | undefined;
  const plan = (notePlan && isPaidPlan(notePlan) ? notePlan : payment.plan) as PlanId;
  if (!isPaidPlan(plan)) {
    return NextResponse.json({ ok: true, skipped: "not a paid plan" });
  }

  await activatePlan(payment.organizationId, plan, {
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    amountPaise: entity?.amount ?? payment.amountPaise,
  });

  return NextResponse.json({ ok: true });
}
