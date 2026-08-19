import { buildFeedbackContext, parseCsv, type ParsedFeedbackRow } from "@/lib/parse-csv";
import { quickSentiment } from "@/lib/sentiment";
import type { ReportQuote } from "@/lib/report-document";

/** Cap rows we parse from an uploaded CSV for file reports. */
export const MAX_FILE_REPORT_ROWS = 500;

/** Soft char budget for the feedback sample sent to the model (~3k tokens). */
export const MAX_FILE_REPORT_SAMPLE_CHARS = 10_000;

export type FileReportLocalStats = {
  totalRows: number;
  parsedRows: number;
  truncatedRows: boolean;
  positive: number;
  negative: number;
  neutral: number;
  channels: Array<{ name: string; count: number }>;
  quotes: ReportQuote[];
  fileOverview: string;
  sentimentOverview: string;
  sampleContext: string;
  dataQualityNote: string;
};

function countBy(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function labelSentiment(value: "POSITIVE" | "NEGATIVE" | "NEUTRAL") {
  if (value === "POSITIVE") return "Positive";
  if (value === "NEGATIVE") return "Negative";
  return "Neutral";
}

function pickQuotes(
  rows: Array<ParsedFeedbackRow & { sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" }>,
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  limit: number,
): ReportQuote[] {
  return rows
    .filter((row) => row.sentiment === sentiment)
    .slice(0, limit)
    .map((row) => ({
      sentiment: labelSentiment(sentiment),
      content: row.content.slice(0, 280),
      channel: row.channel,
      source: "FILE",
      rating: null,
      date: row.createdAt.slice(0, 10),
    }));
}

/**
 * Parse CSV (or line-based feedback) locally and build a compact AI context.
 * Counts / quotes stay local so the model only receives a small sample.
 */
export function buildFileReportLocalStats(input: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  text: string;
}): FileReportLocalStats | { error: string } {
  const { fileName, sizeBytes, text } = input;
  const rows = parseCsv(text, { maxRows: MAX_FILE_REPORT_ROWS });
  if (!rows.length) {
    return {
      error:
        "No feedback rows found in that file. Use a CSV with a content/feedback/message column, or one feedback item per line.",
    };
  }

  const lineCount = text.split(/\r?\n/).filter((line) => line.trim()).length;
  const truncatedRows = lineCount > rows.length + 1;

  const scored = rows.map((row) => ({
    ...row,
    sentiment: quickSentiment(row.content),
  }));

  const positive = scored.filter((row) => row.sentiment === "POSITIVE").length;
  const negative = scored.filter((row) => row.sentiment === "NEGATIVE").length;
  const neutral = scored.length - positive - negative;
  const channels = countBy(scored.map((row) => row.channel)).slice(0, 8);

  const quotes = [
    ...pickQuotes(scored, "NEGATIVE", 2),
    ...pickQuotes(scored, "POSITIVE", 2),
    ...pickQuotes(scored, "NEUTRAL", 1),
  ].slice(0, 5);

  const sizeKb = Math.max(1, Math.round(sizeBytes / 1024));
  const channelSummary =
    channels
      .slice(0, 5)
      .map((channel) => `${channel.name} (${channel.count})`)
      .join(", ") || "n/a";

  const fileOverview = [
    `Uploaded "${fileName}" (${sizeKb} KB).`,
    `Parsed ${scored.length} feedback row${scored.length === 1 ? "" : "s"}`,
    truncatedRows ? `(sampled from a larger file; max ${MAX_FILE_REPORT_ROWS} rows).` : "from the file.",
    `Top channels: ${channelSummary}.`,
  ].join(" ");

  const sentimentOverview = `Local sentiment on ${scored.length} rows: ${pct(positive, scored.length)}% positive (${positive}), ${pct(negative, scored.length)}% negative (${negative}), ${pct(neutral, scored.length)}% neutral (${neutral}).`;

  const sampleContext = buildFeedbackContext(scored, MAX_FILE_REPORT_SAMPLE_CHARS);

  const dataQualityNote = [
    `Based on ${scored.length} parsed row${scored.length === 1 ? "" : "s"}`,
    truncatedRows ? `(file had more lines; capped at ${MAX_FILE_REPORT_ROWS})` : null,
    "Sentiment labels use a fast local heuristic before the AI narrative pass.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    totalRows: lineCount,
    parsedRows: scored.length,
    truncatedRows,
    positive,
    negative,
    neutral,
    channels,
    quotes,
    fileOverview,
    sentimentOverview,
    sampleContext,
    dataQualityNote,
  };
}

export function buildFileReportUserMessage(input: {
  fileName: string;
  organizationName: string;
  stats: FileReportLocalStats;
}) {
  const { fileName, organizationName, stats } = input;
  return `Organization: ${organizationName}
Source file: ${fileName}
Parsed rows: ${stats.parsedRows}${stats.truncatedRows ? ` (capped; file had ~${stats.totalRows} non-empty lines)` : ""}
Counts — positive: ${stats.positive}, negative: ${stats.negative}, neutral: ${stats.neutral}
Channels: ${stats.channels.map((c) => `${c.name} (${c.count})`).join(", ") || "n/a"}

Local file overview:
${stats.fileOverview}

Feedback sample (do not invent beyond this):
${stats.sampleContext}`;
}
