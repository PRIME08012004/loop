"use client";

import AppShell from "@/components/app-shell";
import type { AppRole } from "@/lib/permissions";

export default function DashboardLayoutClient({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: AppRole;
}) {
  return (
    <AppShell userName={userName} userRole={userRole}>
      {children}
    </AppShell>
  );
}
