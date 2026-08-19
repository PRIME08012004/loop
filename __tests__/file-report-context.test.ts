import {
  buildFileReportLocalStats,
  buildFileReportUserMessage,
  MAX_FILE_REPORT_SAMPLE_CHARS,
} from "@/lib/ai/file-report-context";

describe("buildFileReportLocalStats", () => {
  const csv = `content,channel,date
Love the new checkout flow,App Store,2026-08-01
App crashes on payment every time,Google Play,2026-08-02
Works fine for me,Support,2026-08-03
Terrible bug in login,Email,2026-08-04
Great support team,App Store,2026-08-05
`;

  it("parses CSV locally and keeps AI sample under the char budget", () => {
    const stats = buildFileReportLocalStats({
      fileName: "feedback.csv",
      mimeType: "text/csv",
      sizeBytes: csv.length,
      text: csv,
    });

    expect("error" in stats).toBe(false);
    if ("error" in stats) return;

    expect(stats.parsedRows).toBe(5);
    expect(stats.positive).toBeGreaterThan(0);
    expect(stats.negative).toBeGreaterThan(0);
    expect(stats.quotes.length).toBeGreaterThan(0);
    expect(stats.sampleContext.length).toBeLessThanOrEqual(MAX_FILE_REPORT_SAMPLE_CHARS);
    expect(stats.fileOverview).toContain("feedback.csv");
  });

  it("builds a compact user message for the model", () => {
    const stats = buildFileReportLocalStats({
      fileName: "feedback.csv",
      mimeType: "text/csv",
      sizeBytes: csv.length,
      text: csv,
    });
    if ("error" in stats) throw new Error(stats.error);

    const message = buildFileReportUserMessage({
      fileName: "feedback.csv",
      organizationName: "Acme",
      stats,
    });

    expect(message).toContain("Organization: Acme");
    expect(message).toContain("Feedback sample");
    expect(message.length).toBeLessThan(MAX_FILE_REPORT_SAMPLE_CHARS + 800);
  });

  it("rejects files without feedback rows", () => {
    const stats = buildFileReportLocalStats({
      fileName: "empty.csv",
      mimeType: "text/csv",
      sizeBytes: 0,
      text: "",
    });
    expect("error" in stats).toBe(true);
  });
});
