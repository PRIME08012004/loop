import { NextResponse } from "next/server";
// import { requireApiSession } from "@/lib/dashboard-session";
// import { activatePlan, verifyPaymentSignature } from "@/lib/billing";
// import { isPaidPlan, type PlanId } from "@/lib/plans";
// import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_request: Request) {
  // Payments temporarily disabled — all plan features are unlocked without checkout.
  return NextResponse.json(
    { error: "Payments are temporarily disabled. All features are unlocked for now." },
    { status: 503 },
  );

  // const result = await requireApiSession();
  // if ("error" in result) return result.error;
  //
  // if (result.ctx.orgRole !== "OWNER") {
  //   return NextResponse.json({ error: "Only workspace owners can manage billing." }, { status: 403 });
  // }
  //
  // const body = (await request.json()) as {
  //   razorpay_order_id?: unknown;
  //   razorpay_payment_id?: unknown;
  //   razorpay_signature?: unknown;
  //   plan?: unknown;
  // };
  //
  // const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  // const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  // const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  // const plan = typeof body.plan === "string" ? (body.plan.toUpperCase() as PlanId) : null;
  //
  // if (!orderId || !paymentId || !signature || !plan || !isPaidPlan(plan)) {
  //   return NextResponse.json({ error: "Payment verification details are incomplete." }, { status: 400 });
  // }
  //
  // if (!verifyPaymentSignature(orderId, paymentId, signature)) {
  //   await prisma.payment.updateMany({
  //     where: { razorpayOrderId: orderId, organizationId: result.ctx.organizationId },
  //     data: { status: "FAILED" },
  //   });
  //   return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
  // }
  //
  // const payment = await prisma.payment.findFirst({
  //   where: { razorpayOrderId: orderId, organizationId: result.ctx.organizationId },
  // });
  // if (!payment) {
  //   return NextResponse.json({ error: "No matching order was found for this workspace." }, { status: 404 });
  // }
  //
  // const activated = await activatePlan(result.ctx.organizationId, plan, {
  //   razorpayOrderId: orderId,
  //   razorpayPaymentId: paymentId,
  //   razorpaySignature: signature,
  //   amountPaise: payment.amountPaise,
  // });
  //
  // return NextResponse.json({
  //   ok: true,
  //   plan: activated.plan,
  //   planExpiresAt: activated.expiresAt.toISOString(),
  // });
}
