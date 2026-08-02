import Link from "next/link";
import FeedbackDashboard from "@/components/feedback-dashboard";
import { LoopIcon } from "@/components/loop-icons";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { getOrgFeedback } from "@/lib/feedback-query";

export default async function DashboardPage() {
  const { orgRole, organizationId, hasActivePlan, plan } = await requireDashboardSession();
  const initialFeedback = await getOrgFeedback(organizationId);

  return (
    <div className="space-y-4">
      {!hasActivePlan ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-zinc-400">
              <LoopIcon name="lock" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium">You&apos;re on the {plan} plan</p>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Inbox, Trends, Ask LOOP, and Reports stay locked until you activate a paid plan.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings#billing"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            View plans
          </Link>
        </div>
      ) : null}
      <FeedbackDashboard userRole={orgRole} initialFeedback={initialFeedback} />
    </div>
  );
}
