import { jsPDF } from "jspdf";
import {
  formatBytes,
  isFileReport,
  reportDownloadBaseName,
  type LoopReport,
} from "@/lib/report-document";

type PdfWriter = {
  doc: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
};

function createWriter() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  return {
    doc,
    y: margin,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin,
    contentWidth: doc.internal.pageSize.getWidth() - margin * 2,
  } satisfies PdfWriter;
}

function ensureSpace(writer: PdfWriter, needed: number) {
  if (writer.y + needed <= writer.pageHeight - writer.margin) return;
  writer.doc.addPage();
  writer.y = writer.margin;
}

function writeWrapped(
  writer: PdfWriter,
  text: string,
  options: { size?: number; style?: "normal" | "bold"; color?: [number, number, number]; gap?: number } = {},
) {
  const size = options.size ?? 10;
  const style = options.style ?? "normal";
  const color = options.color ?? [24, 24, 27];
  const gap = options.gap ?? 8;

  writer.doc.setFont("helvetica", style);
  writer.doc.setFontSize(size);
  writer.doc.setTextColor(...color);

  const lines = writer.doc.splitTextToSize(text, writer.contentWidth) as string[];
  const lineHeight = size * 1.35;
  ensureSpace(writer, lines.length * lineHeight + gap);
  writer.doc.text(lines, writer.margin, writer.y);
  writer.y += lines.length * lineHeight + gap;
}

function writeHeading(writer: PdfWriter, title: string) {
  ensureSpace(writer, 28);
  writer.y += 4;
  writeWrapped(writer, title, { size: 12, style: "bold", color: [39, 39, 42], gap: 6 });
}

function writeBullets(writer: PdfWriter, items: string[]) {
  for (const item of items) {
    writeWrapped(writer, `• ${item}`, { size: 10, gap: 4 });
  }
  writer.y += 4;
}

function writeKeyValue(writer: PdfWriter, rows: Array<{ label: string; value: string }>) {
  for (const row of rows) {
    writeWrapped(writer, `${row.label}: ${row.value}`, { size: 10, gap: 3 });
  }
  writer.y += 4;
}

/** Build a PDF locally from structured AI report data — never ask the model to generate a PDF. */
export function downloadReportPdf(report: LoopReport, organizationName?: string) {
  const writer = createWriter();
  const title = isFileReport(report) ? "LOOP File Intelligence Report" : "LOOP Voice-of-Customer Report";

  writeWrapped(writer, title, { size: 18, style: "bold", color: [9, 9, 11], gap: 6 });
  writeWrapped(
    writer,
    [report.periodLabel, organizationName, new Date(report.generatedAt).toLocaleString()]
      .filter(Boolean)
      .join("  ·  "),
    { size: 9, color: [113, 113, 122], gap: 14 },
  );

  if (isFileReport(report)) {
    writeHeading(writer, "File details");
    writeKeyValue(writer, [
      { label: "Name", value: report.file.name },
      { label: "Type", value: report.file.type || "unknown" },
      { label: "Size", value: formatBytes(report.file.sizeBytes) },
      { label: "Extension", value: report.file.extension || "n/a" },
    ]);

    writeHeading(writer, "File overview");
    writeWrapped(writer, report.fileOverview);

    writeHeading(writer, "Sentiment overview");
    writeWrapped(writer, report.sentimentOverview);
  } else {
    writeHeading(writer, "Sentiment");
    writeKeyValue(writer, [
      { label: "Total items", value: String(report.total) },
      { label: "Positive", value: `${report.positive} (${report.positivePct}%)` },
      { label: "Negative", value: `${report.negative} (${report.negativePct}%)` },
      { label: "Neutral", value: `${report.neutral} (${report.neutralPct}%)` },
    ]);

    if (report.dateRange?.from || report.dateRange?.to) {
      writeHeading(writer, "Date range");
      writeWrapped(writer, `${report.dateRange.from ?? "n/a"} → ${report.dateRange.to ?? "n/a"}`);
    }
    if (report.sources?.length) {
      writeHeading(writer, "Sources");
      writeBullets(
        writer,
        report.sources.map((source) => `${source.name}: ${source.count}`),
      );
    }
    if (report.channels.length) {
      writeHeading(writer, "Channels");
      writeBullets(
        writer,
        report.channels.map((channel) => `${channel.name}: ${channel.count}`),
      );
    }
    if (report.ratings?.length) {
      writeHeading(writer, "Ratings");
      writeBullets(
        writer,
        report.ratings.map((rating) => `${rating.label}: ${rating.count}`),
      );
    }
    if (report.statuses?.length) {
      writeHeading(writer, "Statuses");
      writeBullets(
        writer,
        report.statuses.map((status) => `${status.name}: ${status.count}`),
      );
    }
  }

  writeHeading(writer, "Summary");
  writeWrapped(writer, report.summary);

  if (report.themes.length) {
    writeHeading(writer, "Themes");
    writeBullets(writer, report.themes);
  }

  if (report.quotes.length) {
    writeHeading(writer, "Verbatim quotes");
    for (const quote of report.quotes) {
      const meta = [
        quote.sentiment,
        quote.channel,
        quote.source,
        quote.rating != null ? `${quote.rating} stars` : null,
        quote.date,
      ]
        .filter(Boolean)
        .join(" · ");
      writeWrapped(writer, meta, { size: 8, style: "bold", color: [82, 82, 91], gap: 2 });
      writeWrapped(writer, `"${quote.content}"`, { size: 10, gap: 10 });
    }
  }

  if (isFileReport(report) && report.hypotheses.length) {
    writeHeading(writer, "Hypotheses");
    for (const hypothesis of report.hypotheses) {
      writeWrapped(writer, `${hypothesis.title} (${hypothesis.confidence}% confidence)`, {
        size: 10,
        style: "bold",
        gap: 3,
      });
      writeWrapped(writer, hypothesis.rationale, { gap: 3 });
      if (hypothesis.evidence.length) {
        writeBullets(writer, hypothesis.evidence);
      }
    }
  }

  if (report.risks?.length) {
    writeHeading(writer, "Risks");
    writeBullets(writer, report.risks);
  }

  if (report.recommendedActions.length) {
    writeHeading(writer, "Recommended actions");
    writeBullets(
      writer,
      report.recommendedActions.map((action, index) => `${index + 1}. ${action}`),
    );
  }

  if (report.dataQuality) {
    writeHeading(writer, "Data quality");
    writeWrapped(writer, report.dataQuality);
  }

  writeWrapped(
    writer,
    "Generated by LOOP from structured report data — PDF created locally, not by the AI model.",
    { size: 8, color: [161, 161, 170], gap: 0 },
  );

  const stamp = new Date(report.generatedAt).toISOString().slice(0, 10);
  writer.doc.save(`${reportDownloadBaseName(report)}-report-${stamp}.pdf`);
}
