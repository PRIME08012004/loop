import Link from "next/link";
import BillingPlans from "@/components/billing-plans";
import { LoopIcon } from "@/components/loop-icons";
import TeamSettings from "@/components/team-settings";
import { currentMonthKey } from "@/lib/billing";
import { requireOrgOwner } from "@/lib/dashboard-session";
import { canAccessFeature, getPlan, type PlanId } from "@/lib/plans";
import prisma from "@/lib/db";
import { ROLE_LABELS, type OrgRole } from "@/lib/permissions";

export default async function SettingsPage() {
  const { userName, orgRole, organizationName, organizationId } = await requireOrgOwner();

  const [members, invites, organization] = await Promise.all([
    prisma.orgMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.orgInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        plan: true,
        planExpiresAt: true,
        askLoopUsedThisMonth: true,
        askLoopMonthKey: true,
      },
    }),
  ]);

  const plan = organization.plan as PlanId;
  const planDef = getPlan(plan);
  const askLoopUsed =
    organization.askLoopMonthKey === currentMonthKey() ? organization.askLoopUsedThisMonth : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Manage {organizationName} — billing, team access, integrations, and workspace settings.
      </p>

      <BillingPlans
        currentPlan={plan}
        planExpiresAt={organization.planExpiresAt?.toISOString() ?? null}
        askLoopUsed={askLoopUsed}
        askLoopLimit={planDef.limits.askLoopPerMonth}
      />

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display), system-ui" }}
        >
          Your profile
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium">{userName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Role</dt>
            <dd className="font-medium">{ROLE_LABELS[orgRole]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Organization</dt>
            <dd className="font-medium">{organizationName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Analyst model</dt>
            <dd className="font-medium font-mono text-xs">{planDef.analysisModel}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display), system-ui" }}
        >
          Integrations
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Connect Google Play to automatically import app reviews every 15 minutes.
          {!canAccessFeature(plan, organization.planExpiresAt, "integrations")
            ? " Locked — available on Advanced and Pro."
            : null}
        </p>
        <Link
          href="/dashboard/settings/integrations"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {!canAccessFeature(plan, organization.planExpiresAt, "integrations") ? (
            <LoopIcon name="lock" className="h-4 w-4" />
          ) : null}
          Manage integrations
        </Link>
      </div>

      <TeamSettings
        initialMembers={members.map((member) => ({
          id: member.id,
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
          role: member.role as OrgRole,
        }))}
        initialInvites={invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role as OrgRole,
        }))}
      />
    </div>
  );
}
