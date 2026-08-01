"use client";

import { useMemo, useState } from "react";
import { LoopIcon } from "@/components/loop-icons";
import { useTheme } from "@/components/theme-provider";
import { sentimentStats, type FeedbackRow, type FeedbackStatus, type Sentiment } from "@/lib/feedback-types";
import { canEditFeedbackStatus, type OrgRole } from "@/lib/permissions";

function StatusPill({ status, isDark }: { status: FeedbackStatus; isDark: boolean }) {
  const map: Record<FeedbackStatus, string> = {
    new: isDark ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-white",
    reviewed: "bg-sky-500/15 text-sky-500 border border-sky-500/30",
    actioned: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[status]}`}>{status}</span>
  );
}

function SentimentDot({ sentiment }: { sentiment: Sentiment }) {
  const color = sentiment === "Negative" ? "bg-rose-500" : sentiment === "Positive" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {sentiment}
    </span>
  );
}

function StatCard({ label, value, hint, accent, isDark }: { label: string; value: string; hint: string; accent: string; isDark: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-slate-900/60" : "border-slate-200 bg-white"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${accent}`} style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{value}</p>
      <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
    </div>
  );
}

export default function FeedbackDashboard({
  userRole,
  initialFeedback,
  emptyMessage = "No feedback yet. Connect Google Play in Settings or paste CSV in Ask LOOP.",
}: {
  userRole: OrgRole;
  initialFeedback: FeedbackRow[];
  emptyMessage?: string;
}) {
  const { isDark } = useTheme();
  const [rows, setRows] = useState<FeedbackRow[]>(initialFeedback);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");

  const stats = useMemo(() => sentimentStats(rows), [rows]);
  const canEdit = canEditFeedbackStatus(userRole);

  const filtered = rows.filter((row) => {
    const matchesSearch = !search || row.content.toLowerCase().includes(search.toLowerCase()) || row.channel.toLowerCase().includes(search.toLowerCase());
    const matchesSentiment = sentimentFilter === "all" || row.sentiment === sentimentFilter;
    return matchesSearch && matchesSentiment;
  });

  const cycleStatus = async (id: string) => {
    if (!canEdit) return;
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const order: FeedbackStatus[] = ["new", "reviewed", "actioned"];
    const next = order[(order.indexOf(row.status) + 1) % order.length];
    setRows((previous) => previous.map((item) => (item.id === id ? { ...item, status: next } : item)));
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  };

  const t = {
    card: isDark ? "border-white/10 bg-slate-900/60" : "border-slate-200 bg-white",
    muted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark ? "bg-slate-900 border-white/10 text-slate-200 placeholder-slate-600" : "bg-white border-slate-200 text-slate-700 placeholder-slate-400",
    tableHead: isDark ? "text-slate-500" : "text-slate-400",
    rowBorder: isDark ? "border-white/5" : "border-slate-100",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <p className={`text-sm ${t.muted}`}>Your organization&apos;s feedback — sentiment, volume, and what needs attention.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total feedback" value={String(stats.total)} hint="Across all connected channels" accent={isDark ? "text-white" : "text-slate-900"} isDark={isDark} />
        <StatCard label="Positive" value={`${stats.positivePct}%`} hint={`${stats.positive} responses feel good`} accent="text-emerald-500" isDark={isDark} />
        <StatCard label="Negative" value={`${stats.negativePct}%`} hint={`${stats.negative} need follow-up`} accent="text-rose-500" isDark={isDark} />
        <StatCard label="Neutral" value={`${stats.neutralPct}%`} hint={`${stats.neutral} mixed or unclear`} accent="text-amber-500" isDark={isDark} />
      </div>

      <div className={`rounded-2xl border p-5 ${t.card}`}>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Recent feedback</h2>
            <p className={`mt-1 text-sm ${t.muted}`}>AI-classified as positive, negative, or neutral when ingested.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${t.input}`}>
              <LoopIcon name="search" className="w-4 h-4 shrink-0 opacity-60" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search feedback..." className="w-40 bg-transparent outline-none sm:w-52" />
            </div>
            <select value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value as Sentiment | "all")} className={`rounded-lg border px-3 py-2 text-sm outline-none ${t.input}`}>
              <option value="all">All sentiment</option>
              <option value="Positive">Positive</option>
              <option value="Negative">Negative</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={t.tableHead}>
                <th className="pb-3 text-left font-medium">Feedback</th>
                <th className="pb-3 text-left font-medium">Channel</th>
                <th className="pb-3 text-left font-medium">Sentiment</th>
                <th className="pb-3 text-left font-medium">Date</th>
                <th className="pb-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className={`border-t ${t.rowBorder}`}>
                  <td className="max-w-xs truncate py-3 pr-4">{row.content}</td>
                  <td className={`py-3 pr-4 ${t.muted}`}>{row.channel}</td>
                  <td className={`py-3 pr-4 ${t.muted}`}><SentimentDot sentiment={row.sentiment} /></td>
                  <td className={`py-3 pr-4 ${t.muted}`}>{row.createdAt}</td>
                  <td className="py-3">
                    {canEdit ? (
                      <button type="button" onClick={() => void cycleStatus(row.id)} title="Click to update status">
                        <StatusPill status={row.status} isDark={isDark} />
                      </button>
                    ) : (
                      <StatusPill status={row.status} isDark={isDark} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className={`py-8 text-center text-sm ${t.muted}`}>{rows.length === 0 ? emptyMessage : "No feedback matches your filters."}</p>}
        </div>
      </div>
    </div>
  );
}
