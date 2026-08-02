import FeatureLock from "@/components/feature-lock";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { getOrgFeedback } from "@/lib/feedback-query";
import { sentimentStats } from "@/lib/feedback-types";
import { canAccessFeature, type PlanId } from "@/lib/plans";

export default async function TrendsPage() {
  const { organizationId, plan, planExpiresAt, effectivePlan } = await requireDashboardSession();

  if (!canAccessFeature(plan, planExpiresAt, "trends")) {
    return <FeatureLock feature="trends" currentPlan={effectivePlan as PlanId} />;
  }

  const feedback = await getOrgFeedback(organizationId, 200);
  const stats = sentimentStats(feedback);
  const channels = [...new Set(feedback.map((row) => row.channel))];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Track how customer sentiment shifts over time and which channels drive the most signal.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Positive", value: `${stats.positivePct}%`, color: "text-emerald-500", desc: `${stats.positive} positive responses` },
          { label: "Negative", value: `${stats.negativePct}%`, color: "text-rose-500", desc: `${stats.negative} need follow-up` },
          { label: "Neutral", value: `${stats.neutralPct}%`, color: "text-amber-500", desc: `${stats.neutral} mixed signals` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{item.label}</p>
            <p
              className={`mt-2 text-3xl font-semibold ${item.color}`}
              style={{ fontFamily: "var(--font-display), system-ui" }}
            >
              {item.value}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-display), system-ui" }}
        >
          Sentiment by channel
        </h2>
        {channels.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Connect Google Play or import feedback to see channel trends.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {channels.map((channel) => {
              const rows = feedback.filter((row) => row.channel === channel);
              const channelStats = sentimentStats(rows);
              return (
                <div key={channel}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{channel}</span>
                    <span className="text-zinc-500">{rows.length} items</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <div className="bg-emerald-500" style={{ width: `${channelStats.positivePct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${channelStats.negativePct}%` }} />
                    <div className="bg-amber-500" style={{ width: `${channelStats.neutralPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
