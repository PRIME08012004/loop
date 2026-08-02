import { currentMonthKey } from "@/lib/billing";
import prisma from "@/lib/db";
import {
  effectivePlan,
  getPlan,
  hasActivePaidPlan,
  type PlanId,
} from "@/lib/plans";

export type UsageMetricKey = "feedback" | "askLoop" | "reports" | "members";

export type UsageMetric = {
  key: UsageMetricKey;
  label: string;
  used: number;
  limit: number;
  period: "total" | "month";
};

export type PlanUsage = {
  plan: PlanId;
  planName: string;
  effectivePlan: PlanId;
  hasActivePlan: boolean;
  planExpiresAt: string | null;
  metrics: UsageMetric[];
  flags: {
    integrations: boolean;
    shareChats: boolean;
    integrationsConnected: boolean;
  };
};

export async function getPlanUsage(organizationId: string): Promise<PlanUsage> {
  const monthKey = currentMonthKey();

  const [organization, feedbackUsed, membersUsed, integration] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        plan: true,
        planExpiresAt: true,
        askLoopUsedThisMonth: true,
        askLoopMonthKey: true,
        reportsUsedThisMonth: true,
        reportsMonthKey: true,
      },
    }),
    prisma.feedbackItem.count({ where: { organizationId } }),
    prisma.orgMember.count({ where: { organizationId } }),
    prisma.appIntegration.findFirst({
      where: { organizationId, status: "ACTIVE" },
      select: { id: true },
    }),
  ]);

  const plan = organization.plan as PlanId;
  const planExpiresAt = organization.planExpiresAt;
  const effective = effectivePlan(plan, planExpiresAt);
  const definition = getPlan(effective);
  const askUsed =
    organization.askLoopMonthKey === monthKey ? organization.askLoopUsedThisMonth : 0;
  const reportsUsed =
    organization.reportsMonthKey === monthKey ? organization.reportsUsedThisMonth : 0;

  return {
    plan,
    planName: getPlan(plan).name,
    effectivePlan: effective,
    hasActivePlan: hasActivePaidPlan(plan, planExpiresAt),
    planExpiresAt: planExpiresAt?.toISOString() ?? null,
    metrics: [
      {
        key: "feedback",
        label: "Feedback items",
        used: feedbackUsed,
        limit: definition.limits.feedbackItems,
        period: "total",
      },
      {
        key: "askLoop",
        label: "Ask LOOP questions",
        used: askUsed,
        limit: definition.limits.askLoopPerMonth,
        period: "month",
      },
      {
        key: "reports",
        label: "Reports",
        used: reportsUsed,
        limit: definition.limits.reportsPerMonth,
        period: "month",
      },
      {
        key: "members",
        label: "Team members",
        used: membersUsed,
        limit: definition.limits.members,
        period: "total",
      },
    ],
    flags: {
      integrations: definition.limits.integrations,
      shareChats: definition.limits.shareChats,
      integrationsConnected: Boolean(integration),
    },
  };
}

export function metricNearLimit(metric: UsageMetric) {
  if (metric.limit <= 0) return metric.used > 0;
  return metric.used / metric.limit >= 0.85;
}
