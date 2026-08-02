import { Suspense } from "react";
import FeatureLock from "@/components/feature-lock";
import IntegrationsSettings from "@/components/integrations-settings";
import { requireOrgOwner } from "@/lib/dashboard-session";
import { canAccessFeature, type PlanId } from "@/lib/plans";
import prisma from "@/lib/db";

export default async function IntegrationsPage() {
  const { organizationId, plan, planExpiresAt, effectivePlan } = await requireOrgOwner();

  if (!canAccessFeature(plan, planExpiresAt, "integrations")) {
    return <FeatureLock feature="integrations" currentPlan={effectivePlan as PlanId} />;
  }

  const integration = await prisma.appIntegration.findUnique({
    where: { organizationId_provider: { organizationId, provider: "GOOGLE_PLAY" } },
    select: {
      provider: true,
      packageName: true,
      status: true,
      lastPolledAt: true,
      lastPollError: true,
      refreshToken: true,
    },
  });

  const initialIntegration = integration
    ? {
        provider: integration.provider,
        packageName: integration.packageName,
        status: integration.status,
        lastPolledAt: integration.lastPolledAt?.toISOString() ?? null,
        lastPollError: integration.lastPollError,
        hasTokens: Boolean(integration.refreshToken),
      }
    : null;

  return (
    <Suspense>
      <IntegrationsSettings initialIntegration={initialIntegration} />
    </Suspense>
  );
}
