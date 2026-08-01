import { Suspense } from "react";
import IntegrationsSettings from "@/components/integrations-settings";
import { requireOrgOwner } from "@/lib/dashboard-session";
import prisma from "@/lib/db";

export default async function IntegrationsPage() {
  const { organizationId } = await requireOrgOwner();

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
