import FeedbackDashboard from "@/components/feedback-dashboard";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { getOrgFeedback } from "@/lib/feedback-query";

export default async function InboxPage() {
  const { orgRole, organizationId } = await requireDashboardSession();
  const initialFeedback = await getOrgFeedback(organizationId, 200);
  return <FeedbackDashboard userRole={orgRole} initialFeedback={initialFeedback} />;
}
