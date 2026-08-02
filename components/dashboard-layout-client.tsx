"use client";

import AppShell from "@/components/app-shell";
import type { AppRole } from "@/lib/permissions";
import type { PlanId } from "@/lib/plans";

export type SidebarUsageSummary = {
  askUsed: number;
  askLimit: number;
  feedbackUsed: number;
  feedbackLimit: number;
};

export default function DashboardLayoutClient({
  children,
  userName,
  userRole,
  plan,
  planExpiresAt,
  hasActivePlan,
  usageSummary,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: AppRole;
  plan: PlanId;
  planExpiresAt: string | null;
  hasActivePlan: boolean;
  usageSummary: SidebarUsageSummary;
}) {
  return (
    <AppShell
      userName={userName}
      userRole={userRole}
      plan={plan}
      planExpiresAt={planExpiresAt}
      hasActivePlan={hasActivePlan}
      usageSummary={usageSummary}
    >
      {children}
    </AppShell>
  );
}
