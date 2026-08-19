import FeatureLock from "@/components/feature-lock";
import ReportGenerator from "@/components/report-generator";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { canExportReports } from "@/lib/permissions";
import { canAccessFeature, type PlanId } from "@/lib/plans";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const { orgRole, plan, planExpiresAt, effectivePlan } = await requireDashboardSession();
  if (!canExportReports(orgRole)) redirect("/dashboard");

  if (!canAccessFeature(plan, planExpiresAt, "reports")) {
    return <FeatureLock feature="reports" currentPlan={effectivePlan as PlanId} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Generate Voice-of-Customer reports from organization feedback or an uploaded CSV. AI returns
        narrative fields only — counts and the downloadable PDF are built locally.
      </p>
      <ReportGenerator />
    </div>
  );
}
