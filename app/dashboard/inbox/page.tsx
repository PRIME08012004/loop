import FeatureLock from "@/components/feature-lock";
import FeedbackDashboard from "@/components/feedback-dashboard";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { getOrgFeedback } from "@/lib/feedback-query";
import { canAccessFeature, type PlanId } from "@/lib/plans";

export default async function InboxPage() {
  const { orgRole, organizationId, plan, planExpiresAt, effectivePlan } = await requireDashboardSession();

  if (!canAccessFeature(plan, planExpiresAt, "inbox")) {
    return <FeatureLock feature="inbox" currentPlan={effectivePlan as PlanId} />;
  }

  const initialFeedback = await getOrgFeedback(organizationId, 200);
  return <FeedbackDashboard userRole={orgRole} initialFeedback={initialFeedback} />;
}
