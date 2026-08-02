import type { PlanUsage, UsageMetric } from "@/lib/plan-usage";
import { metricNearLimit } from "@/lib/plan-usage";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function MetricRow({ metric }: { metric: UsageMetric }) {
  const pct = metric.limit > 0 ? Math.min(100, Math.round((metric.used / metric.limit) * 100)) : metric.used > 0 ? 100 : 0;
  const warn = metricNearLimit(metric);
  const locked = metric.limit <= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <div>
          <p className="font-medium text-zinc-950 dark:text-white">{metric.label}</p>
          <p className="text-xs text-zinc-400">
            {metric.period === "month" ? "This month" : "Workspace total"}
          </p>
        </div>
        <p className={`tabular-nums ${warn ? "font-medium text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-300"}`}>
          {locked ? (
            <>
              {formatCount(metric.used)} · not included
            </>
          ) : (
            <>
              {formatCount(metric.used)} / {formatCount(metric.limit)}
            </>
          )}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className={`h-full rounded-full transition-all ${
            locked
              ? "bg-zinc-300 dark:bg-zinc-700"
              : warn
                ? "bg-amber-500"
                : "bg-zinc-950 dark:bg-white"
          }`}
          style={{ width: `${locked ? 0 : pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PlanUsagePanel({ usage }: { usage: PlanUsage }) {
  return (
    <section
      id="usage"
      className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display), system-ui" }}
          >
            Plan usage
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {usage.planName} plan
            {usage.planExpiresAt
              ? ` · renews/ends ${new Date(usage.planExpiresAt).toLocaleDateString("en-IN")}`
              : null}
            {!usage.hasActivePlan ? " · upgrade to unlock full limits" : null}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {usage.metrics.map((metric) => (
          <MetricRow key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            usage.flags.integrations
              ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              : "bg-zinc-50 text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600"
          }`}
        >
          Integrations {usage.flags.integrations ? (usage.flags.integrationsConnected ? "connected" : "unlocked") : "locked"}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            usage.flags.shareChats
              ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              : "bg-zinc-50 text-zinc-400 dark:bg-zinc-950 dark:text-zinc-600"
          }`}
        >
          Share chats {usage.flags.shareChats ? "unlocked" : "locked"}
        </span>
      </div>
    </section>
  );
}
