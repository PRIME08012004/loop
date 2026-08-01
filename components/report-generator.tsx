"use client";

import { useState } from "react";
import { IconLoader2, IconCopy, IconCheck } from "@tabler/icons-react";
import { useTheme } from "@/components/theme-provider";

type Report = {
  periodLabel: string;
  generatedAt: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  channels: Array<{ name: string; count: number }>;
  summary: string;
  themes: string[];
  quotes: Array<{ sentiment: string; content: string; channel: string }>;
  recommendedActions: string[];
};

function formatReportText(report: Report, organizationName?: string) {
  const lines = [
    `LOOP Voice-of-Customer report${organizationName ? ` — ${organizationName}` : ""}`,
    `Period: ${report.periodLabel}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    "",
    `Sentiment — ${report.total} items`,
    `Positive: ${report.positive} (${report.positivePct}%)`,
    `Negative: ${report.negative} (${report.negativePct}%)`,
    `Neutral: ${report.neutral} (${report.neutralPct}%)`,
    "",
    "Summary",
    report.summary,
    "",
    "Themes",
    ...report.themes.map((theme) => `• ${theme}`),
    "",
    "Verbatim quotes",
    ...report.quotes.map((quote) => `• [${quote.sentiment}] ${quote.channel}: ${quote.content}`),
    "",
    "Recommended actions",
    ...report.recommendedActions.map((action) => `• ${action}`),
  ];
  if (report.channels.length) {
    lines.splice(
      9,
      0,
      "",
      "Channels",
      ...report.channels.map((channel) => `• ${channel.name}: ${channel.count}`),
    );
  }
  return lines.join("\n");
}

export default function ReportGenerator() {
  const { isDark } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [organizationName, setOrganizationName] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/reports", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        report?: Report;
        organizationName?: string;
      };
      if (!response.ok || !payload.report) {
        setError(payload.error ?? "Could not generate the report. Please try again.");
        return;
      }
      setReport(payload.report);
      setOrganizationName(payload.organizationName);
    } catch {
      setError("Could not generate the report. Check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(formatReportText(report, organizationName));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  const card = isDark ? "border-white/10 bg-slate-900/60" : "border-slate-200 bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const border = isDark ? "border-white/10" : "border-slate-200";

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-8 ${card}`}>
        <h2
          className="font-display text-xl font-semibold"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Weekly sentiment report
        </h2>
        <p className={`mt-2 text-sm ${muted}`}>
          Covers the last 7 days across connected channels (falls back to all available feedback if
          the week is empty). Includes sentiment breakdown, themes, and verbatim quotes.
        </p>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={isGenerating}
          className={`mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
            isDark
              ? "bg-white text-zinc-900 hover:bg-zinc-200"
              : "bg-zinc-900 text-white hover:bg-zinc-800"
          }`}
        >
          {isGenerating ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              Generating…
            </>
          ) : (
            "Generate report"
          )}
        </button>
        {error ? <p className="mt-4 text-sm text-rose-500">{error}</p> : null}
      </div>

      {report ? (
        <div className={`rounded-2xl border p-8 ${card}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
                {report.periodLabel}
                {organizationName ? ` · ${organizationName}` : ""}
              </p>
              <h3
                className="mt-1 font-display text-2xl font-semibold"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Voice-of-Customer report
              </h3>
              <p className={`mt-1 text-xs ${muted}`}>
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyReport()}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${border} ${muted} hover:opacity-80`}
            >
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Positive", value: `${report.positivePct}%`, hint: `${report.positive} items`, color: "text-emerald-500" },
              { label: "Negative", value: `${report.negativePct}%`, hint: `${report.negative} items`, color: "text-rose-500" },
              { label: "Neutral", value: `${report.neutralPct}%`, hint: `${report.neutral} items`, color: "text-amber-500" },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-xl border p-4 ${border}`}>
                <p className={`text-xs uppercase tracking-wider ${muted}`}>{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                <p className={`text-xs ${muted}`}>{stat.hint}</p>
              </div>
            ))}
          </div>

          <section className="mt-8 space-y-2">
            <h4 className="text-sm font-semibold">Summary</h4>
            <p className={`text-sm leading-relaxed ${muted}`}>{report.summary}</p>
          </section>

          {report.channels.length ? (
            <section className="mt-8 space-y-2">
              <h4 className="text-sm font-semibold">Channels</h4>
              <ul className="space-y-1.5">
                {report.channels.map((channel) => (
                  <li key={channel.name} className={`flex justify-between text-sm ${muted}`}>
                    <span>{channel.name}</span>
                    <span>{channel.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8 space-y-2">
            <h4 className="text-sm font-semibold">Themes</h4>
            <ul className="space-y-2">
              {report.themes.map((theme) => (
                <li key={theme} className={`text-sm ${muted}`}>
                  · {theme}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 space-y-3">
            <h4 className="text-sm font-semibold">Verbatim quotes</h4>
            {report.quotes.map((quote, index) => (
              <blockquote
                key={`${quote.channel}-${index}`}
                className={`rounded-xl border p-4 text-sm ${border}`}
              >
                <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
                  {quote.sentiment} · {quote.channel}
                </p>
                <p className="mt-2 leading-relaxed">&ldquo;{quote.content}&rdquo;</p>
              </blockquote>
            ))}
          </section>

          <section className="mt-8 space-y-2">
            <h4 className="text-sm font-semibold">Recommended actions</h4>
            <ol className={`list-decimal space-y-2 pl-5 text-sm ${muted}`}>
              {report.recommendedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </div>
  );
}
