export type ReportQuote = {
  sentiment: string;
  content: string;
  channel: string;
  source?: string;
  rating?: number | null;
  date?: string;
};

export type OrgReport = {
  kind?: "org";
  periodLabel: string;
  generatedAt: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positivePct: number;
  negativePct: number;
  neutralPct: number;
  dateRange?: { from: string | null; to: string | null };
  sources?: Array<{ name: string; count: number }>;
  channels: Array<{ name: string; count: number }>;
  ratings?: Array<{ label: string; count: number }>;
  statuses?: Array<{ name: string; count: number }>;
  summary: string;
  themes: string[];
  quotes: ReportQuote[];
  recommendedActions: string[];
  risks?: string[];
  dataQuality?: string;
};

export type FileReport = {
  kind: "file";
  periodLabel: string;
  generatedAt: string;
  file: {
    name: string;
    type: string;
    sizeBytes: number;
    extension: string;
  };
  summary: string;
  fileOverview: string;
  sentimentOverview: string;
  themes: string[];
  quotes: ReportQuote[];
  hypotheses: Array<{
    title: string;
    confidence: number;
    rationale: string;
    evidence: string[];
  }>;
  recommendedActions: string[];
  risks: string[];
  dataQuality: string;
};

export type LoopReport = OrgReport | FileReport;

export function isFileReport(report: LoopReport): report is FileReport {
  return report.kind === "file";
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatReportText(report: LoopReport, organizationName?: string) {
  const orgLine = organizationName ? ` — ${organizationName}` : "";
  const lines: string[] = [
    `LOOP Voice-of-Customer report${orgLine}`,
    `Period: ${report.periodLabel}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    "",
  ];

  if (isFileReport(report)) {
    lines.push(
      "File details",
      `• Name: ${report.file.name}`,
      `• Type: ${report.file.type || "unknown"}`,
      `• Size: ${formatBytes(report.file.sizeBytes)}`,
      `• Extension: ${report.file.extension || "n/a"}`,
      "",
      "File overview",
      report.fileOverview,
      "",
      "Sentiment overview",
      report.sentimentOverview,
      "",
    );
  } else {
    lines.push(
      `Sentiment — ${report.total} items`,
      `Positive: ${report.positive} (${report.positivePct}%)`,
      `Negative: ${report.negative} (${report.negativePct}%)`,
      `Neutral: ${report.neutral} (${report.neutralPct}%)`,
      "",
    );
    if (report.dateRange?.from || report.dateRange?.to) {
      lines.push(
        "Date range",
        `• From: ${report.dateRange.from ?? "n/a"}`,
        `• To: ${report.dateRange.to ?? "n/a"}`,
        "",
      );
    }
    if (report.sources?.length) {
      lines.push("Sources", ...report.sources.map((source) => `• ${source.name}: ${source.count}`), "");
    }
    if (report.channels.length) {
      lines.push("Channels", ...report.channels.map((channel) => `• ${channel.name}: ${channel.count}`), "");
    }
    if (report.ratings?.length) {
      lines.push("Ratings", ...report.ratings.map((rating) => `• ${rating.label}: ${rating.count}`), "");
    }
    if (report.statuses?.length) {
      lines.push("Statuses", ...report.statuses.map((status) => `• ${status.name}: ${status.count}`), "");
    }
  }

  lines.push("Summary", report.summary, "");
  if (report.themes.length) {
    lines.push("Themes", ...report.themes.map((theme) => `• ${theme}`), "");
  }
  if (report.quotes.length) {
    lines.push(
      "Verbatim quotes",
      ...report.quotes.map((quote) => {
        const meta = [
          quote.sentiment,
          quote.channel,
          quote.source,
          quote.rating != null ? `${quote.rating}★` : null,
          quote.date,
        ]
          .filter(Boolean)
          .join(" · ");
        return `• [${meta}] ${quote.content}`;
      }),
      "",
    );
  }
  if (isFileReport(report) && report.hypotheses.length) {
    lines.push("Hypotheses");
    for (const hypothesis of report.hypotheses) {
      lines.push(`• ${hypothesis.title} (${hypothesis.confidence}% confidence)`);
      lines.push(`  ${hypothesis.rationale}`);
      for (const evidence of hypothesis.evidence) {
        lines.push(`  - ${evidence}`);
      }
    }
    lines.push("");
  }
  if (report.risks?.length) {
    lines.push("Risks", ...report.risks.map((risk) => `• ${risk}`), "");
  }
  if (report.recommendedActions.length) {
    lines.push(
      "Recommended actions",
      ...report.recommendedActions.map((action, index) => `${index + 1}. ${action}`),
      "",
    );
  }
  if (report.dataQuality) {
    lines.push("Data quality", report.dataQuality, "");
  }

  return `${lines.join("\n").trim()}\n`;
}

export function reportDownloadBaseName(report: LoopReport) {
  if (isFileReport(report)) {
    return report.file.name.replace(/\.[^.]+$/, "") || "loop-file-report";
  }
  return "loop-voc-report";
}
