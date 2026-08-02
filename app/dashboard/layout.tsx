import DashboardLayoutClient from "@/components/dashboard-layout-client";
import { requireDashboardSession } from "@/lib/dashboard-session";
import type { PlanId } from "@/lib/plans";
import { getPlanUsage } from "@/lib/plan-usage";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userName, userRole, plan, planExpiresAt, hasActivePlan, organizationId } =
    await requireDashboardSession();
  const usage = await getPlanUsage(organizationId);
  const ask = usage.metrics.find((metric) => metric.key === "askLoop");
  const feedback = usage.metrics.find((metric) => metric.key === "feedback");

  return (
    <DashboardLayoutClient
      userName={userName}
      userRole={userRole}
      plan={plan as PlanId}
      planExpiresAt={planExpiresAt?.toISOString() ?? null}
      hasActivePlan={hasActivePlan}
      usageSummary={{
        askUsed: ask?.used ?? 0,
        askLimit: ask?.limit ?? 0,
        feedbackUsed: feedback?.used ?? 0,
        feedbackLimit: feedback?.limit ?? 0,
      }}
    >
      {children}
    </DashboardLayoutClient>
  );
}
