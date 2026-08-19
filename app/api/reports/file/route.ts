import { NextResponse } from "next/server";
import {
  buildFileReportLocalStats,
  buildFileReportUserMessage,
  type FileReportLocalStats,
} from "@/lib/ai/file-report-context";
import { isPromptLimitError, promptLimitUserMessage } from "@/lib/ai/file-context";
import { analysisModelForPlan, openRouterChat } from "@/lib/ai/openrouter";
import { fileReportNarrativePrompt } from "@/lib/ai/prompts";
import { consumeReportCredit } from "@/lib/billing";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
import { canExportReports } from "@/lib/permissions";
import type { PlanId } from "@/lib/plans";
import type { FileReport } from "@/lib/report-document";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["text/csv", "text/plain", "text/markdown"]);
const ACCEPTED_EXTENSIONS = [".csv", ".txt", ".md"];

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function isAcceptedFile(file: File) {
  const filename = file.name.toLowerCase();
  return (
    ACCEPTED_TYPES.has(file.type) ||
    ACCEPTED_EXTENSIONS.some((extension) => filename.endsWith(extension))
  );
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildBaseFileReport(file: File, stats: FileReportLocalStats): FileReport {
  return {
    kind: "file",
    periodLabel: `File report — ${file.name}`,
    generatedAt: new Date().toISOString(),
    file: {
      name: file.name,
      type: file.type || "unknown",
      sizeBytes: file.size,
      extension: file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "",
    },
    summary: `${stats.sentimentOverview} Top channels: ${
      stats.channels
        .slice(0, 3)
        .map((channel) => channel.name)
        .join(", ") || "n/a"
    }.`,
    fileOverview: stats.fileOverview,
    sentimentOverview: stats.sentimentOverview,
    themes: [],
    quotes: stats.quotes,
    hypotheses: [],
    recommendedActions: [
      "Triage the newest negative items from this upload and assign owners.",
      "Ask LOOP one follow-up question about the strongest theme in this file.",
    ],
    risks:
      stats.negative > stats.positive && stats.negative > 0
        ? ["Negative feedback outweighs positive in this upload — watch for compounding friction."]
        : [],
    dataQuality: stats.dataQualityNote,
  };
}

function mergeNarrative(base: FileReport, parsed: Record<string, unknown>): FileReport {
  const themes = Array.isArray(parsed.themes)
    ? parsed.themes.map(String).map((theme) => theme.slice(0, 120)).filter(Boolean).slice(0, 5)
    : base.themes;

  const recommendedActions = Array.isArray(parsed.recommendedActions)
    ? parsed.recommendedActions
        .map(String)
        .map((action) => action.slice(0, 240))
        .filter(Boolean)
        .slice(0, 4)
    : base.recommendedActions;

  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.map(String).map((risk) => risk.slice(0, 200)).filter(Boolean).slice(0, 3)
    : base.risks;

  const hypotheses = Array.isArray(parsed.hypotheses)
    ? parsed.hypotheses.slice(0, 4).map((hypothesis) => {
        const item = hypothesis as Record<string, unknown>;
        return {
          title: String(item.title ?? "Untitled hypothesis").slice(0, 160),
          confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
          rationale: String(item.rationale ?? "No rationale returned.").slice(0, 500),
          evidence: Array.isArray(item.evidence)
            ? item.evidence.slice(0, 3).map(String).map((line) => line.slice(0, 240))
            : [],
        };
      })
    : base.hypotheses;

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 1200)
      : base.summary;

  const sentimentOverview =
    typeof parsed.sentimentOverview === "string" && parsed.sentimentOverview.trim()
      ? parsed.sentimentOverview.trim().slice(0, 800)
      : base.sentimentOverview;

  const dataQuality =
    typeof parsed.dataQuality === "string" && parsed.dataQuality.trim()
      ? `${parsed.dataQuality.trim().slice(0, 500)} ${base.dataQuality}`.trim()
      : base.dataQuality;

  return {
    ...base,
    summary,
    sentimentOverview,
    themes,
    hypotheses,
    recommendedActions,
    risks,
    dataQuality,
  };
}

export async function POST(request: Request) {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const { organizationId, organizationName, orgRole } = result.ctx;
  if (!canExportReports(orgRole)) {
    return NextResponse.json({ error: "You do not have permission to generate reports." }, { status: 403 });
  }

  const planGate = assertPlanFeature(result.ctx, "reports");
  if ("error" in planGate) return planGate.error;

  const plan = result.ctx.effectivePlan as PlanId;
  const apiKey = process.env.OPENROUTER_API_KEY;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to generate a report." }, { status: 400 });
  }
  if (!isAcceptedFile(file)) {
    return NextResponse.json({ error: "Upload a CSV, TXT, or Markdown file." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 413 });
  }

  const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const stats = buildFileReportLocalStats({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    text,
  });
  if ("error" in stats) {
    return NextResponse.json({ error: stats.error }, { status: 400 });
  }

  const credit = await consumeReportCredit(organizationId, plan);
  if (!credit.ok) {
    return NextResponse.json({ error: credit.reason }, { status: 402 });
  }

  const base = buildBaseFileReport(file, stats);

  // Without an API key, still return the local stats so the client can build a PDF.
  if (!apiKey) {
    return NextResponse.json({
      report: base,
      organizationName,
      usage: { used: credit.used, limit: credit.limit },
      localOnly: true,
    });
  }

  const model = analysisModelForPlan(plan);

  try {
    const response = await openRouterChat({
      apiKey,
      model,
      title: "LOOP File Reports",
      temperature: 0.25,
      // Narrative-only completion — keep completion tokens low.
      maxTokens: 1400,
      messages: [
        { role: "system", content: fileReportNarrativePrompt() },
        {
          role: "user",
          content: buildFileReportUserMessage({
            fileName: file.name,
            organizationName,
            stats,
          }),
        },
      ],
    });

    const payload = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      const providerMessage = payload.error?.message;
      if (isPromptLimitError(providerMessage)) {
        return NextResponse.json(
          {
            error: promptLimitUserMessage(),
            usage: { used: credit.used, limit: credit.limit },
          },
          { status: 413 },
        );
      }
      // Soft-fail: return local report so the client can still download a PDF.
      return NextResponse.json({
        report: base,
        organizationName,
        warning: providerMessage,
        usage: { used: credit.used, limit: credit.limit },
      });
    }

    const parsed = extractJsonObject(payload.choices?.[0]?.message?.content ?? "");
    const report = parsed ? mergeNarrative(base, parsed) : base;

    return NextResponse.json({
      report,
      organizationName,
      usage: { used: credit.used, limit: credit.limit },
      model,
      truncated: stats.truncatedRows,
    });
  } catch {
    return NextResponse.json({
      report: base,
      organizationName,
      usage: { used: credit.used, limit: credit.limit },
    });
  }
}
