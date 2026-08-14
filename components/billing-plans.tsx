"use client";

import { useState } from "react";
import { formatInr, PAID_PLANS, type PlanId } from "@/lib/plans";

type BillingProps = {
  currentPlan: PlanId;
  planExpiresAt: string | null;
};

// --- Razorpay checkout temporarily disabled ---
// type RazorpayInstance = {
//   open: () => void;
//   on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
// };
//
// declare global {
//   interface Window {
//     Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
//   }
// }
//
// function loadRazorpayScript() {
//   return new Promise<boolean>((resolve) => {
//     if (window.Razorpay) {
//       resolve(true);
//       return;
//     }
//     const existing = document.querySelector<HTMLScriptElement>('script[data-loop-razorpay="1"]');
//     if (existing) {
//       existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
//       existing.addEventListener("error", () => resolve(false), { once: true });
//       return;
//     }
//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.async = true;
//     script.dataset.loopRazorpay = "1";
//     script.onload = () => resolve(Boolean(window.Razorpay));
//     script.onerror = () => resolve(false);
//     document.body.appendChild(script);
//   });
// }
//
// async function readJson(response: Response) {
//   const text = await response.text();
//   if (!text) return {} as Record<string, unknown>;
//   try {
//     return JSON.parse(text) as Record<string, unknown>;
//   } catch {
//     throw new Error(
//       response.ok
//         ? "Checkout returned an invalid response."
//         : `Checkout failed (${response.status}). Check server logs.`,
//     );
//   }
// }

export default function BillingPlans({ currentPlan, planExpiresAt }: BillingProps) {
  const [loadingPlan] = useState<PlanId | null>(null);
  const [message] = useState<string | null>(
    "Payments are temporarily disabled. All features are unlocked for now.",
  );

  // async function checkout(plan: PlanId) {
  //   setLoadingPlan(plan);
  //   setMessage(null);
  //
  //   try {
  //     const orderResponse = await fetch("/api/billing/create-order", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ plan }),
  //     });
  //     const order = await readJson(orderResponse);
  //
  //     const keyId = typeof order.keyId === "string" ? order.keyId.trim() : "";
  //     const orderId = typeof order.orderId === "string" ? order.orderId : "";
  //     const amount = typeof order.amount === "number" ? order.amount : Number(order.amount);
  //     const currency = typeof order.currency === "string" ? order.currency : "INR";
  //     const planName = typeof order.planName === "string" ? order.planName : plan;
  //     const organizationName =
  //       typeof order.organizationName === "string" ? order.organizationName : "LOOP workspace";
  //     const prefill =
  //       order.prefill && typeof order.prefill === "object"
  //         ? (order.prefill as { name?: string; email?: string })
  //         : undefined;
  //
  //     if (!orderResponse.ok || !keyId || !orderId || !Number.isFinite(amount)) {
  //       setMessage(
  //         (typeof order.error === "string" && order.error) ||
  //           "Could not start checkout. Confirm Razorpay keys and database migrations.",
  //       );
  //       return;
  //     }
  //
  //     const ready = await loadRazorpayScript();
  //     if (!ready || !window.Razorpay) {
  //       setMessage("Razorpay checkout failed to load. Allow checkout.razorpay.com or try another network.");
  //       return;
  //     }
  //
  //     const rzp = new window.Razorpay({
  //       key: keyId,
  //       amount,
  //       currency,
  //       name: "LOOP",
  //       description: `${planName} plan — ${organizationName}`,
  //       order_id: orderId,
  //       prefill,
  //       theme: { color: "#18181b" },
  //       handler: async (response: {
  //         razorpay_order_id: string;
  //         razorpay_payment_id: string;
  //         razorpay_signature: string;
  //       }) => {
  //         try {
  //           const verifyResponse = await fetch("/api/billing/verify", {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({ ...response, plan }),
  //           });
  //           const payload = await readJson(verifyResponse);
  //           if (!verifyResponse.ok) {
  //             setMessage(
  //               (typeof payload.error === "string" && payload.error) ||
  //                 "Payment received but verification failed. Contact support.",
  //             );
  //             return;
  //           }
  //           setMessage(`You're on ${String(payload.plan ?? planName)}. Refreshing…`);
  //           window.location.reload();
  //         } catch (verifyError) {
  //           setMessage(
  //             verifyError instanceof Error
  //               ? verifyError.message
  //               : "Payment received but verification failed. Contact support.",
  //           );
  //         }
  //       },
  //       modal: {
  //         ondismiss: () => {
  //           setMessage("Checkout closed before payment completed.");
  //         },
  //       },
  //     });
  //
  //     rzp.on("payment.failed", (response) => {
  //       const error = response.error as { description?: string; reason?: string } | undefined;
  //       setMessage(error?.description || error?.reason || "Payment failed. Try again.");
  //     });
  //
  //     rzp.open();
  //   } catch (error) {
  //     setMessage(error instanceof Error ? error.message : "Something went wrong starting checkout.");
  //   } finally {
  //     setLoadingPlan(null);
  //   }
  // }

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
          <p className="mt-1 text-xs text-zinc-400">
            Razorpay checkout is temporarily disabled. Full LOOP access is unlocked without payment.
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
                disabled
                // onClick={() => void checkout(plan.id)}
                className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {active ? "Current plan" : loadingPlan === plan.id ? "Opening Razorpay…" : "Checkout disabled"}
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
