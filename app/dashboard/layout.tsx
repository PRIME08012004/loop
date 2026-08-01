import DashboardLayoutClient from "@/components/dashboard-layout-client";
import { requireDashboardSession } from "@/lib/dashboard-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userName, userRole } = await requireDashboardSession();

  return (
    <DashboardLayoutClient userName={userName} userRole={userRole}>
      {children}
    </DashboardLayoutClient>
  );
}
