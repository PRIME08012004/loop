"use client";

import { useState } from "react";
import type { OrgRole } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/permissions";

type Member = { id: string; userId: string; name: string | null; email: string | null; role: OrgRole };
type Invite = { id: string; email: string; role: OrgRole };

export default function TeamSettings({
  initialMembers,
  initialInvites,
}: {
  initialMembers: Member[];
  initialInvites: Invite[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("ANALYST");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/org/members");
    if (!response.ok) return;
    const payload = (await response.json()) as { members?: Member[]; invites?: Invite[] };
    setMembers(payload.members ?? []);
    setInvites(payload.invites ?? []);
  };

  const invite = async () => {
    setMessage(null);
    const response = await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const payload = (await response.json()) as { error?: string; invited?: boolean; added?: boolean };
    if (!response.ok) {
      setMessage(payload.error ?? "Could not invite member.");
      return;
    }
    setMessage(payload.added ? `${email} added to your organization.` : `Invite sent to ${email}.`);
    setEmail("");
    void load();
  };

  const removeMember = async (memberId: string) => {
    await fetch(`/api/org/members?memberId=${memberId}`, { method: "DELETE" });
    void load();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/60">
      <h2 className="font-display text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Team members</h2>
      <p className="mt-1 text-sm text-slate-500">Analysts can explore feedback and use Ask LOOP. Viewers have read-only access.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900">
          <option value="ANALYST">Analyst</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <button type="button" onClick={() => void invite()} className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500">
          Invite
        </button>
      </div>

      {message && <p className="mt-3 text-sm text-violet-600 dark:text-violet-300">{message}</p>}

      <ul className="mt-6 space-y-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-white/5">
            <div>
              <p className="font-medium">{member.name ?? member.email}</p>
              <p className="text-xs text-slate-400">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{ROLE_LABELS[member.role]}</span>
              {member.role !== "OWNER" && (
                <button type="button" onClick={() => void removeMember(member.id)} className="text-xs text-rose-500 hover:underline">
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {invites.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pending invites</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500">
            {invites.map((pending) => (
              <li key={pending.id}>{pending.email} — {ROLE_LABELS[pending.role]}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
