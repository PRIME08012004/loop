import Link from "next/link";
import { LoopIcon } from "@/components/loop-icons";
import {
  FEATURE_LABELS,
  formatInr,
  requiredPlanFor,
  type PlanFeature,
  type PlanId,
} from "@/lib/plans";

export default function FeatureLock({
  feature,
  currentPlan,
}: {
  feature: PlanFeature;
  currentPlan: PlanId;
}) {
  const required = requiredPlanFor(feature);
  const label = FEATURE_LABELS[feature];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <LoopIcon name="lock" className="h-6 w-6" />
      </span>
      <h2
        className="mt-6 text-2xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display), system-ui" }}
      >
        {label} is locked
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Your workspace is on <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentPlan}</span>.
        Unlock {label} with the <span className="font-medium text-zinc-800 dark:text-zinc-200">{required.name}</span>{" "}
        plan ({formatInr(required.priceInr)}/mo) or higher.
      </p>
      <Link
        href="/dashboard/settings#billing"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        <LoopIcon name="lock" className="h-4 w-4" />
        Upgrade plan
      </Link>
    </div>
  );
}
