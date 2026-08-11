"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  IconLoader2,
  IconCopy,
  IconCheck,
  IconDownload,
  IconPaperclip,
  IconFileText,
} from "@tabler/icons-react";
import { useTheme } from "@/components/theme-provider";
import {
  formatBytes,
  formatReportText,
  isFileReport,
  type FileReport,
  type LoopReport,
  type OrgReport,
} from "@/lib/report-document";
import { downloadReportPdf } from "@/lib/report-pdf";

export default function ReportGenerator() {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"org" | "file">("org");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<LoopReport | null>(null);
  const [organizationName, setOrganizationName] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const generateOrgReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/reports", { method: "POST" });
      const payload = (await response.json()) as {
        error?: string;
        report?: OrgReport;
        organizationName?: string;
      };
      if (!response.ok || !payload.report) {
        setError(payload.error ?? "Could not generate the report. Please try again.");
        return;
      }
      setReport({ ...payload.report, kind: "org" });
      setOrganizationName(payload.organizationName);
    } catch {
      setError("Could not generate the report. Check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFileReport = async () => {
    if (!selectedFile) {
      setError("Choose a CSV, TXT, or Markdown file first.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch("/api/reports/file", { method: "POST", body: formData });
      const payload = (await response.json()) as {
        error?: string;
        report?: FileReport;
        organizationName?: string;
      };
      if (!response.ok || !payload.report) {
        setError(payload.error ?? "Could not generate the file report. Please try again.");
        return;
      }
      setReport(payload.report);
      setOrganizationName(payload.organizationName);
    } catch {
      setError("Could not generate the file report. Check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generate = async () => {
    if (mode === "file") {
      await generateFileReport();
      return;
    }
    await generateOrgReport();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setSelectedFile(file);
    setError(null);
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

  const downloadPdf = async () => {
    if (!report) return;
    setIsDownloading(true);
    setError(null);
    try {
      downloadReportPdf(report, organizationName);
    } catch {
      setError("Could not create the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const card = isDark ? "border-white/10 bg-slate-900/60" : "border-slate-200 bg-white";
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const border = isDark ? "border-white/10" : "border-slate-200";
  const modeActive = isDark ? "bg-white text-zinc-900" : "bg-zinc-900 text-white";
  const modeIdle = isDark
    ? "border-white/10 text-slate-300 hover:bg-white/5"
    : "border-slate-200 text-slate-600 hover:bg-slate-50";

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-8 ${card}`}>
        <h2
          className="font-display text-xl font-semibold"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Voice-of-Customer report
        </h2>
        <p className={`mt-2 text-sm ${muted}`}>
          AI returns structured report data only. LOOP builds the downloadable PDF locally from that
          data — the model never generates a PDF.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("org")}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              mode === "org" ? modeActive : modeIdle
            }`}
          >
            Organization feedback
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
              mode === "file" ? modeActive : modeIdle
            }`}
          >
            Upload file
          </button>
        </div>

        {mode === "org" ? (
          <p className={`mt-4 text-sm ${muted}`}>
            Covers the last 7 days across connected sources (falls back to all available feedback if
            the week is empty). Includes sentiment, sources, channels, ratings, themes, quotes, and
            risks.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className={`text-sm ${muted}`}>
              Upload CSV, TXT, or Markdown feedback. Large files are sampled for the AI context limit.
              After generation, download a PDF built here from the returned data.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.md,text/csv,text/plain,text/markdown"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition ${border} ${muted} hover:opacity-80`}
              >
                <IconPaperclip size={14} />
                Choose file
              </button>
              {selectedFile ? (
                <span className={`inline-flex items-center gap-1.5 text-xs ${muted}`}>
                  <IconFileText size={14} />
                  {selectedFile.name} · {formatBytes(selectedFile.size)}
                </span>
              ) : (
                <span className={`text-xs ${muted}`}>No file selected</span>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={isGenerating || (mode === "file" && !selectedFile)}
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
          ) : mode === "file" ? (
            "Generate file report"
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
                {isFileReport(report) ? "File intelligence report" : "Voice-of-Customer report"}
              </h3>
              <p className={`mt-1 text-xs ${muted}`}>
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyReport()}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${border} ${muted} hover:opacity-80`}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => void downloadPdf()}
                disabled={isDownloading}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
                  isDark
                    ? "bg-white text-zinc-900 hover:bg-zinc-200"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                {isDownloading ? <IconLoader2 size={14} className="animate-spin" /> : <IconDownload size={14} />}
                Download PDF
              </button>
            </div>
          </div>

          {isFileReport(report) ? (
            <>
              <section className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "File name", value: report.file.name },
                  { label: "Size", value: formatBytes(report.file.sizeBytes) },
                  { label: "Type", value: report.file.type || "unknown" },
                  { label: "Extension", value: report.file.extension || "n/a" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border p-4 ${border}`}>
                    <p className={`text-xs uppercase tracking-wider ${muted}`}>{item.label}</p>
                    <p className="mt-1 break-all text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </section>

              <section className="mt-8 space-y-2">
                <h4 className="text-sm font-semibold">File overview</h4>
                <p className={`text-sm leading-relaxed ${muted}`}>{report.fileOverview}</p>
              </section>

              <section className="mt-8 space-y-2">
                <h4 className="text-sm font-semibold">Sentiment overview</h4>
                <p className={`text-sm leading-relaxed ${muted}`}>{report.sentimentOverview}</p>
              </section>
            </>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Positive",
                    value: `${report.positivePct}%`,
                    hint: `${report.positive} items`,
                    color: "text-emerald-500",
                  },
                  {
                    label: "Negative",
                    value: `${report.negativePct}%`,
                    hint: `${report.negative} items`,
                    color: "text-rose-500",
                  },
                  {
                    label: "Neutral",
                    value: `${report.neutralPct}%`,
                    hint: `${report.neutral} items`,
                    color: "text-amber-500",
                  },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-xl border p-4 ${border}`}>
                    <p className={`text-xs uppercase tracking-wider ${muted}`}>{stat.label}</p>
                    <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                    <p className={`text-xs ${muted}`}>{stat.hint}</p>
                  </div>
                ))}
              </div>

              {(report.dateRange?.from || report.dateRange?.to) && (
                <section className="mt-8 space-y-2">
                  <h4 className="text-sm font-semibold">Date range</h4>
                  <p className={`text-sm ${muted}`}>
                    {report.dateRange.from ?? "n/a"} → {report.dateRange.to ?? "n/a"}
                  </p>
                </section>
              )}

              {report.sources?.length ? (
                <section className="mt-8 space-y-2">
                  <h4 className="text-sm font-semibold">Sources</h4>
                  <ul className="space-y-1.5">
                    {report.sources.map((source) => (
                      <li key={source.name} className={`flex justify-between text-sm ${muted}`}>
                        <span>{source.name}</span>
                        <span>{source.count}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

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

              {report.ratings?.length ? (
                <section className="mt-8 space-y-2">
                  <h4 className="text-sm font-semibold">Ratings</h4>
                  <ul className="space-y-1.5">
                    {report.ratings.map((rating) => (
                      <li key={rating.label} className={`flex justify-between text-sm ${muted}`}>
                        <span>{rating.label}</span>
                        <span>{rating.count}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {report.statuses?.length ? (
                <section className="mt-8 space-y-2">
                  <h4 className="text-sm font-semibold">Statuses</h4>
                  <ul className="space-y-1.5">
                    {report.statuses.map((status) => (
                      <li key={status.name} className={`flex justify-between text-sm ${muted}`}>
                        <span>{status.name}</span>
                        <span>{status.count}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}

          <section className="mt-8 space-y-2">
            <h4 className="text-sm font-semibold">Summary</h4>
            <p className={`text-sm leading-relaxed ${muted}`}>{report.summary}</p>
          </section>

          {report.themes.length ? (
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
          ) : null}

          {report.quotes.length ? (
            <section className="mt-8 space-y-3">
              <h4 className="text-sm font-semibold">Verbatim quotes</h4>
              {report.quotes.map((quote, index) => (
                <blockquote
                  key={`${quote.channel}-${index}`}
                  className={`rounded-xl border p-4 text-sm ${border}`}
                >
                  <p className={`text-xs font-medium uppercase tracking-wider ${muted}`}>
                    {[quote.sentiment, quote.channel, quote.source, quote.rating != null ? `${quote.rating}★` : null, quote.date]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="mt-2 leading-relaxed">&ldquo;{quote.content}&rdquo;</p>
                </blockquote>
              ))}
            </section>
          ) : null}

          {isFileReport(report) && report.hypotheses.length ? (
            <section className="mt-8 space-y-3">
              <h4 className="text-sm font-semibold">Hypotheses</h4>
              {report.hypotheses.map((hypothesis) => (
                <div key={hypothesis.title} className={`rounded-xl border p-4 ${border}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{hypothesis.title}</p>
                    <p className={`text-xs ${muted}`}>{hypothesis.confidence}% confidence</p>
                  </div>
                  <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{hypothesis.rationale}</p>
                  {hypothesis.evidence.length ? (
                    <ul className={`mt-3 space-y-1 text-sm ${muted}`}>
                      {hypothesis.evidence.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}

          {report.risks?.length ? (
            <section className="mt-8 space-y-2">
              <h4 className="text-sm font-semibold">Risks</h4>
              <ul className="space-y-2">
                {report.risks.map((risk) => (
                  <li key={risk} className={`text-sm ${muted}`}>
                    · {risk}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {report.recommendedActions.length ? (
            <section className="mt-8 space-y-2">
              <h4 className="text-sm font-semibold">Recommended actions</h4>
              <ol className={`list-decimal space-y-2 pl-5 text-sm ${muted}`}>
                {report.recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {report.dataQuality ? (
            <section className="mt-8 space-y-2">
              <h4 className="text-sm font-semibold">Data quality</h4>
              <p className={`text-sm leading-relaxed ${muted}`}>{report.dataQuality}</p>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
