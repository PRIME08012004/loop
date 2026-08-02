import DashboardLayoutClient from "@/components/dashboard-layout-client";
import { requireDashboardSession } from "@/lib/dashboard-session";
import type { PlanId } from "@/lib/plans";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userName, userRole, plan, planExpiresAt, hasActivePlan } = await requireDashboardSession();

  return (
    <DashboardLayoutClient
      userName={userName}
      userRole={userRole}
      plan={plan as PlanId}
      planExpiresAt={planExpiresAt?.toISOString() ?? null}
      hasActivePlan={hasActivePlan}
    >
      {children}
    </DashboardLayoutClient>
  );
}
