import crypto from "crypto";
import Razorpay from "razorpay";
import prisma from "@/lib/db";
import { getPlan, type PlanId } from "@/lib/plans";

/** Next/dotenv usually strip quotes; also handle pasted values with whitespace/quotes. */
function envCredential(name: "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET") {
  const raw = process.env[name];
  if (!raw) return "";
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function getRazorpay() {
  const keyId = envCredential("RAZORPAY_KEY_ID");
  const keySecret = envCredential("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.");
  }
  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    throw new Error("RAZORPAY_KEY_ID looks invalid. It should start with rzp_test_ or rzp_live_.");
  }
  if (keySecret.startsWith("rzp_")) {
    throw new Error("RAZORPAY_KEY_SECRET looks like a Key ID. Paste the Key Secret from the Razorpay dashboard.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function razorpayConfigured() {
  return Boolean(envCredential("RAZORPAY_KEY_ID") && envCredential("RAZORPAY_KEY_SECRET"));
}

export function razorpayKeyId() {
  return envCredential("RAZORPAY_KEY_ID");
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = envCredential("RAZORPAY_KEY_SECRET");
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = envCredential("RAZORPAY_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function activatePlan(organizationId: string, plan: PlanId, paymentMeta?: {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amountPaise?: number;
}) {
  const definition = getPlan(plan);
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        plan,
        planExpiresAt: expiresAt,
        razorpayOrderId: paymentMeta?.razorpayOrderId,
      },
    });

    if (paymentMeta?.razorpayOrderId) {
      await tx.payment.updateMany({
        where: { razorpayOrderId: paymentMeta.razorpayOrderId },
        data: {
          status: "PAID",
          plan,
          razorpayPaymentId: paymentMeta.razorpayPaymentId,
          razorpaySignature: paymentMeta.razorpaySignature,
          amountPaise: paymentMeta.amountPaise ?? definition.amountPaise,
        },
      });
    }
  });

  return { plan, expiresAt };
}

export function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function consumeAskLoopCredit(organizationId: string, plan: PlanId) {
  const limit = getPlan(plan).limits.askLoopPerMonth;
  const monthKey = currentMonthKey();

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { askLoopUsedThisMonth: true, askLoopMonthKey: true },
  });
  if (!org) return { ok: false as const, reason: "Organization not found." };

  const used = org.askLoopMonthKey === monthKey ? org.askLoopUsedThisMonth : 0;
  if (used >= limit) {
    return {
      ok: false as const,
      reason: `You have used all ${limit} Ask LOOP questions on your ${getPlan(plan).name} plan this month. Upgrade for more capacity.`,
      used,
      limit,
    };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      askLoopMonthKey: monthKey,
      askLoopUsedThisMonth: used + 1,
    },
  });

  return { ok: true as const, used: used + 1, limit };
}

export async function consumeReportCredit(organizationId: string, plan: PlanId) {
  const limit = getPlan(plan).limits.reportsPerMonth;
  const monthKey = currentMonthKey();

  if (limit <= 0) {
    return {
      ok: false as const,
      reason: `Reports require a Beginner plan or higher. Upgrade for report capacity.`,
      used: 0,
      limit: 0,
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { reportsUsedThisMonth: true, reportsMonthKey: true },
  });
  if (!org) return { ok: false as const, reason: "Organization not found." };

  const used = org.reportsMonthKey === monthKey ? org.reportsUsedThisMonth : 0;
  if (used >= limit) {
    return {
      ok: false as const,
      reason: `You have used all ${limit} reports on your ${getPlan(plan).name} plan this month. Upgrade for more capacity.`,
      used,
      limit,
    };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      reportsMonthKey: monthKey,
      reportsUsedThisMonth: used + 1,
    },
  });

  return { ok: true as const, used: used + 1, limit };
}
