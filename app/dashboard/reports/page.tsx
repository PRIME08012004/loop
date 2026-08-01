import { redirect } from "next/navigation";
import ReportGenerator from "@/components/report-generator";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { canExportReports } from "@/lib/permissions";

export default async function ReportsPage() {
  const { orgRole } = await requireDashboardSession();
  if (!canExportReports(orgRole)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Generate Voice-of-Customer reports with sentiment summaries, top themes, and verbatim quotes
        — ready to share with leadership.
      </p>
      <ReportGenerator />
    </div>
  );
}
