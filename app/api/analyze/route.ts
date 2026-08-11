import { NextResponse } from "next/server";
import { analysisModelForPlan, openRouterChat } from "@/lib/ai/openrouter";
import { fileAnalysisPrompt } from "@/lib/ai/prompts";
import { auth } from "@/lib/auth";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
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
  choices?: Array<{
    message?: { content?: string };
  }>;
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

  if (start === -1) {
    throw new Error("No JSON object found in model response.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const character = cleaned[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, index + 1)) as unknown;
      }
    }
  }

  throw new Error("Model response contains incomplete JSON.");
}

function normalizeAnalysis(value: unknown) {
  const analysis = value as Record<string, unknown>;
  const hypotheses = Array.isArray(analysis.hypotheses)
    ? analysis.hypotheses.slice(0, 4).map((hypothesis) => {
        const item = hypothesis as Record<string, unknown>;
        return {
          title: String(item.title ?? "Untitled hypothesis"),
          confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
          rationale: String(item.rationale ?? "No rationale returned."),
          evidence: Array.isArray(item.evidence)
            ? item.evidence.slice(0, 3).map(String)
            : [],
        };
      })
    : [];

  const keyQuotes = Array.isArray(analysis.keyQuotes)
    ? analysis.keyQuotes.slice(0, 5).map((quote) => {
        const item = quote as Record<string, unknown>;
        return {
          sentiment: String(item.sentiment ?? "Neutral").slice(0, 20),
          content: String(item.content ?? "").slice(0, 400),
          channel: String(item.channel ?? "Source file").slice(0, 120),
        };
      }).filter((quote) => quote.content)
    : [];

  return {
    summary: String(analysis.summary ?? "No summary returned."),
    fileOverview: String(analysis.fileOverview ?? "File overview was not assessed."),
    sentimentOverview: String(analysis.sentimentOverview ?? "Sentiment mix was not assessed."),
    themes: Array.isArray(analysis.themes)
      ? analysis.themes.map(String).map((theme) => theme.slice(0, 120)).filter(Boolean).slice(0, 5)
      : [],
    keyQuotes,
    hypotheses,
    recommendedActions: Array.isArray(analysis.recommendedActions)
      ? analysis.recommendedActions.slice(0, 4).map(String)
      : [],
    dataQuality: String(analysis.dataQuality ?? "Data quality was not assessed."),
    risks: Array.isArray(analysis.risks)
      ? analysis.risks.map(String).map((risk) => risk.slice(0, 200)).filter(Boolean).slice(0, 3)
      : [],
  };
}

function createProseAnalysis(text: string) {
  const briefing = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim()
    .slice(0, 6000);

  return {
    summary: briefing || "The AI did not return a readable briefing.",
    fileOverview: "Structured file overview was not returned.",
    sentimentOverview: "Structured sentiment overview was not returned.",
    themes: [],
    keyQuotes: [],
    hypotheses: [],
    recommendedActions: [],
    dataQuality:
      "The model returned a narrative briefing instead of structured fields. Review the summary and try again for a richer hypothesis breakdown.",
    risks: [],
  };
}

function getProviderErrorMessage(status: number, message?: string) {
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (
    status === 429 ||
    normalizedMessage.includes("quota exceeded") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Analysis is temporarily busy because the AI usage limit has been reached. Please wait a moment and try again.";
  }

  if (status === 401 || status === 403) {
    return "The AI connection could not be verified. Check the server-side OpenRouter API key and its permissions.";
  }

  if (status === 402 || normalizedMessage.includes("insufficient credits")) {
    return "This AI provider is unavailable for the current account. Try again later or upgrade your LOOP plan.";
  }

  if (status === 400 || status === 413) {
    return "This file could not be processed by the selected AI model. Try a smaller CSV, TXT, Markdown, or text-based PDF file.";
  }

  if (status >= 500) {
    return "Something went wrong while the AI was reviewing your file. Please try again in a moment.";
  }

  return "Something went wrong while analyzing this file. Please check the file and try again.";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in to analyze files." }, { status: 401 });
  }

  const orgResult = await requireApiSession();
  if ("error" in orgResult) return orgResult.error;

  const planGate = assertPlanFeature(orgResult.ctx, "ask");
  if ("error" in planGate) return planGate.error;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI analysis is not configured. Add OPENROUTER_API_KEY to your environment." },
      { status: 503 },
    );
  }

  const plan = orgResult.ctx.effectivePlan as PlanId;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to analyze." }, { status: 400 });
  }

  if (!isAcceptedFile(file)) {
    return NextResponse.json(
      { error: "Upload a CSV, TXT, Markdown, or PDF file." },
      { status: 415 },
    );
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Files must be between 1 byte and 10 MB." },
      { status: 413 },
    );
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

  const response = await openRouterChat({
    apiKey,
    model,
    title: "LOOP Analytics",
    temperature: 0.15,
    maxTokens: 1800,
    messages: [{ role: "user", content }],
  });

  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    console.error("OpenRouter analysis request failed", {
      status: response.status,
      message: payload.error?.message,
      model,
    });
    return NextResponse.json(
      { error: getProviderErrorMessage(response.status, payload.error?.message) },
      { status: response.status },
    );
  }

  const text = payload.choices?.[0]?.message?.content;

  if (!text) {
    return NextResponse.json(
      { error: "The AI returned no analysis for this file. Please try again." },
      { status: 502 },
    );
  }

  const fileMeta = {
    name: file.name,
    type: file.type || "unknown",
    sizeBytes: file.size,
    extension: file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "",
  };

  try {
    return NextResponse.json({
      analysis: normalizeAnalysis(extractJson(text)),
      file: fileMeta,
      generatedAt: new Date().toISOString(),
      model,
    });
  } catch {
    console.warn("OpenRouter returned a prose analysis instead of JSON.");
    return NextResponse.json({
      analysis: createProseAnalysis(text),
      file: fileMeta,
      generatedAt: new Date().toISOString(),
      model,
    });
  }
}
