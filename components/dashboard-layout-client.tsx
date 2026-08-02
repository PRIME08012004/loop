"use client";

import AppShell from "@/components/app-shell";
import type { AppRole } from "@/lib/permissions";
import type { PlanId } from "@/lib/plans";

export default function DashboardLayoutClient({
  children,
  userName,
  userRole,
  plan,
  planExpiresAt,
  hasActivePlan,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: AppRole;
  plan: PlanId;
  planExpiresAt: string | null;
  hasActivePlan: boolean;
}) {
  return (
    <AppShell
      userName={userName}
      userRole={userRole}
      plan={plan}
      planExpiresAt={planExpiresAt}
      hasActivePlan={hasActivePlan}
    >
      {children}
    </AppShell>
  );
}
