import Link from "next/link";
import TeamSettings from "@/components/team-settings";
import { requireOrgOwner } from "@/lib/dashboard-session";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function SettingsPage() {
  const { userName, orgRole, organizationName } = await requireOrgOwner();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Manage {organizationName} — team access, integrations, and workspace settings.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/60">
        <h2 className="font-display text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Your profile</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium">{userName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium">{ROLE_LABELS[orgRole]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Organization</dt>
            <dd className="font-medium">{organizationName}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/60">
        <h2 className="font-display text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Integrations</h2>
        <p className="mt-2 text-sm text-slate-500">Connect Google Play to automatically import app reviews every 15 minutes.</p>
        <Link href="/dashboard/settings/integrations" className="mt-4 inline-block rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500">
          Manage integrations
        </Link>
      </div>

      <TeamSettings />
    </div>
  );
}
