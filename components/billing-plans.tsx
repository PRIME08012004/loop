"use client";

import { useState } from "react";
import { formatInr, PAID_PLANS, type PlanId } from "@/lib/plans";

type BillingProps = {
  currentPlan: PlanId;
  planExpiresAt: string | null;
  askLoopUsed: number;
  askLoopLimit: number;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function BillingPlans({ currentPlan, planExpiresAt, askLoopUsed, askLoopLimit }: BillingProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function checkout(plan: PlanId) {
    setLoadingPlan(plan);
    setMessage(null);

    try {
      const orderResponse = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const order = (await orderResponse.json()) as {
        error?: string;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        planName?: string;
        organizationName?: string;
        prefill?: { name?: string; email?: string };
      };

      if (!orderResponse.ok || !order.keyId || !order.orderId) {
        setMessage(order.error ?? "Could not start checkout.");
        return;
      }

      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) {
        setMessage("Razorpay checkout failed to load. Check your network and try again.");
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "LOOP",
        description: `${order.planName} plan — ${order.organizationName}`,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: "#18181b" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyResponse = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, plan }),
          });
          const payload = (await verifyResponse.json()) as { error?: string; plan?: string };
          if (!verifyResponse.ok) {
            setMessage(payload.error ?? "Payment received but verification failed. Contact support.");
            return;
          }
          setMessage(`You're on ${payload.plan}. Refreshing…`);
          window.location.reload();
        },
      });

      rzp.open();
    } catch {
      setMessage("Something went wrong starting checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section id="billing" className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display), system-ui" }}
          >
            Billing & plans
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Current plan: <span className="font-medium text-zinc-950 dark:text-white">{currentPlan}</span>
            {planExpiresAt ? ` · renews/ends ${new Date(planExpiresAt).toLocaleDateString("en-IN")}` : null}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Ask LOOP usage: {askLoopUsed} / {askLoopLimit} this month
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((plan) => {
          const active = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-xl border p-5 ${
                plan.highlighted
                  ? "border-zinc-950 dark:border-white"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.highlighted ? (
                  <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Popular</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {formatInr(plan.priceInr)}
                <span className="text-sm font-normal text-zinc-500">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-zinc-400">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={active || loadingPlan !== null}
                onClick={() => void checkout(plan.id)}
                className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {active ? "Current plan" : loadingPlan === plan.id ? "Opening Razorpay…" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {message ? (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {message}
        </p>
      ) : null}
    </section>
  );
}
