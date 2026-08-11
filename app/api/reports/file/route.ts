import { NextResponse } from "next/server";
import { analysisModelForPlan, openRouterChat } from "@/lib/ai/openrouter";
import { fileAnalysisPrompt } from "@/lib/ai/prompts";
import { consumeReportCredit } from "@/lib/billing";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
import { canExportReports } from "@/lib/permissions";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/pdf",
]);
const ACCEPTED_EXTENSIONS = [".csv", ".txt", ".md", ".pdf"];

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

function extractJson(text: string) {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model response.");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const character = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, index + 1)) as Record<string, unknown>;
      }
    }
  }
  throw new Error("Model response contains incomplete JSON.");
}

function normalizeFileReport(value: Record<string, unknown>, file: File) {
  const hypotheses = Array.isArray(value.hypotheses)
    ? value.hypotheses.slice(0, 4).map((hypothesis) => {
        const item = hypothesis as Record<string, unknown>;
        return {
          title: String(item.title ?? "Untitled hypothesis"),
          confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
          rationale: String(item.rationale ?? "No rationale returned."),
          evidence: Array.isArray(item.evidence) ? item.evidence.slice(0, 3).map(String) : [],
        };
      })
    : [];

  const quotes = Array.isArray(value.keyQuotes)
    ? value.keyQuotes
        .slice(0, 5)
        .map((quote) => {
          const item = quote as Record<string, unknown>;
          return {
            sentiment: String(item.sentiment ?? "Neutral").slice(0, 20),
            content: String(item.content ?? "").slice(0, 400),
            channel: String(item.channel ?? "Source file").slice(0, 120),
            source: "FILE",
            rating: null as number | null,
            date: new Date().toISOString().slice(0, 10),
          };
        })
        .filter((quote) => quote.content)
    : [];

  return {
    kind: "file" as const,
    periodLabel: `File report — ${file.name}`,
    generatedAt: new Date().toISOString(),
    file: {
      name: file.name,
      type: file.type || "unknown",
      sizeBytes: file.size,
      extension: file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "",
    },
    summary: String(value.summary ?? "No summary returned.").slice(0, 2000),
    fileOverview: String(value.fileOverview ?? "File overview was not assessed.").slice(0, 1200),
    sentimentOverview: String(value.sentimentOverview ?? "Sentiment mix was not assessed.").slice(0, 800),
    themes: Array.isArray(value.themes)
      ? value.themes.map(String).map((theme) => theme.slice(0, 120)).filter(Boolean).slice(0, 5)
      : [],
    quotes,
    hypotheses,
    recommendedActions: Array.isArray(value.recommendedActions)
      ? value.recommendedActions.map(String).map((action) => action.slice(0, 240)).filter(Boolean).slice(0, 4)
      : [],
    risks: Array.isArray(value.risks)
      ? value.risks.map(String).map((risk) => risk.slice(0, 200)).filter(Boolean).slice(0, 3)
      : [],
    dataQuality: String(value.dataQuality ?? "Data quality was not assessed.").slice(0, 800),
  };
}

function proseFallback(text: string, file: File) {
  const briefing = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim()
    .slice(0, 6000);

  return normalizeFileReport(
    {
      summary: briefing || "The AI did not return a readable briefing.",
      fileOverview: `Uploaded file "${file.name}" (${Math.round(file.size / 1024)} KB).`,
      sentimentOverview: "Structured sentiment overview was not returned.",
      themes: [],
      keyQuotes: [],
      hypotheses: [],
      recommendedActions: [],
      dataQuality:
        "The model returned a narrative briefing instead of structured fields. Download the report and retry for a richer breakdown.",
      risks: [],
    },
    file,
  );
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
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI analysis is not configured. Add OPENROUTER_API_KEY to your environment." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to generate a report." }, { status: 400 });
  }
  if (!isAcceptedFile(file)) {
    return NextResponse.json({ error: "Upload a CSV, TXT, Markdown, or PDF file." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 413 });
  }

  const credit = await consumeReportCredit(organizationId, plan);
  if (!credit.ok) {
    return NextResponse.json({ error: credit.reason }, { status: 402 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const prompt = fileAnalysisPrompt();
  const model = analysisModelForPlan(plan);
  const content =
    file.type === "application/pdf"
      ? [
          { type: "text", text: prompt },
          {
            type: "file",
            file: {
              filename: file.name,
              file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
            },
          },
        ]
      : [
          {
            type: "text",
            text: `${prompt}\n\nSource file: ${file.name}\n<source>\n${buffer.toString("utf8")}\n</source>`,
          },
        ];

  try {
    const response = await openRouterChat({
      apiKey,
      model,
      title: "LOOP File Reports",
      temperature: 0.15,
      maxTokens: 2200,
      messages: [{ role: "user", content }],
    });

    const payload = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      return NextResponse.json(
        {
          error: payload.error?.message ?? "Could not analyze this file. Please try again.",
          usage: { used: credit.used, limit: credit.limit },
        },
        { status: response.status >= 400 ? response.status : 502 },
      );
    }

    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      return NextResponse.json(
        { error: "The AI returned no analysis for this file. Please try again." },
        { status: 502 },
      );
    }

    try {
      const report = normalizeFileReport(extractJson(text), file);
      return NextResponse.json({
        report,
        organizationName,
        usage: { used: credit.used, limit: credit.limit },
        model,
      });
    } catch {
      return NextResponse.json({
        report: proseFallback(text, file),
        organizationName,
        usage: { used: credit.used, limit: credit.limit },
        model,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while generating the file report. Please try again." },
      { status: 500 },
    );
  }
}
