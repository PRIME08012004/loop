import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/dashboard-session";
import { canExportReports } from "@/lib/permissions";
import prisma from "@/lib/db";

export const runtime = "nodejs";

type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type ReportPayload = {
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

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
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

function buildFallbackReport(input: {
  periodLabel: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  channels: Array<{ name: string; count: number }>;
  quotes: ReportPayload["quotes"];
}): ReportPayload {
  const { periodLabel, total, positive, negative, neutral, channels, quotes } = input;
  const topChannel = channels[0]?.name ?? "connected channels";
  const tone =
    negative > positive
      ? "Customer sentiment leaned negative this period — prioritize the top complaints before they compound."
      : positive > negative
        ? "Customer sentiment leaned positive this period — reinforce what’s working and close remaining gaps."
        : "Customer sentiment was mixed this period — clarify themes before committing roadmap time.";

  const themes: string[] = [];
  if (negative > 0) themes.push("Friction or unresolved issues in negative feedback");
  if (positive > 0) themes.push("Moments customers praised — preserve and amplify");
  if (channels.length > 1) themes.push(`Volume concentrated in ${topChannel}`);
  if (!themes.length) themes.push("Not enough labeled feedback to extract themes yet");

  const recommendedActions: string[] = [];
  if (negative > 0) {
    recommendedActions.push("Triage the newest negative items in Inbox and assign owners.");
  }
  if (positive > 0) {
    recommendedActions.push("Share 2–3 positive verbatims with the team to reinforce wins.");
  }
  recommendedActions.push("Ask LOOP one follow-up question about the strongest theme this week.");

  return {
    periodLabel,
    generatedAt: new Date().toISOString(),
    total,
    positive,
    negative,
    neutral,
    positivePct: pct(positive, total),
    negativePct: pct(negative, total),
    neutralPct: pct(neutral, total),
    channels,
    summary: `${tone} Across ${total} item${total === 1 ? "" : "s"} in ${periodLabel.toLowerCase()}, sentiment was ${pct(positive, total)}% positive, ${pct(negative, total)}% negative, and ${pct(neutral, total)}% neutral.`,
    themes: themes.slice(0, 5),
    quotes,
    recommendedActions: recommendedActions.slice(0, 4),
  };
}

export async function POST() {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const { organizationId, organizationName, orgRole } = result.ctx;
  if (!canExportReports(orgRole)) {
    return NextResponse.json({ error: "You do not have permission to generate reports." }, { status: 403 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let items = await prisma.feedbackItem.findMany({
    where: { organizationId, ingestedAt: { gte: since } },
    orderBy: { ingestedAt: "desc" },
    take: 200,
  });

  let periodLabel = "Last 7 days";
  if (!items.length) {
    items = await prisma.feedbackItem.findMany({
      where: { organizationId },
      orderBy: { ingestedAt: "desc" },
      take: 200,
    });
    periodLabel = items.length ? "All available feedback" : "Last 7 days";
  }

  if (!items.length) {
    return NextResponse.json(
      {
        error:
          "No feedback to report on yet. Connect Google Play or upload CSV in Ask LOOP, then try again.",
      },
      { status: 400 },
    );
  }

  const positive = items.filter((item) => item.sentiment === "POSITIVE").length;
  const negative = items.filter((item) => item.sentiment === "NEGATIVE").length;
  const neutral = items.length - positive - negative;

  const channelCounts = new Map<string, number>();
  for (const item of items) {
    channelCounts.set(item.channel, (channelCounts.get(item.channel) ?? 0) + 1);
  }
  const channels = [...channelCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const pickQuotes = (sentiment: SentimentLabel, limit: number) =>
    items
      .filter((item) => item.sentiment === sentiment)
      .slice(0, limit)
      .map((item) => ({
        sentiment: sentiment === "POSITIVE" ? "Positive" : sentiment === "NEGATIVE" ? "Negative" : "Neutral",
        content: item.content.slice(0, 280),
        channel: item.channel,
      }));

  const quotes = [
    ...pickQuotes("NEGATIVE", 2),
    ...pickQuotes("POSITIVE", 2),
    ...pickQuotes("NEUTRAL", 1),
  ].slice(0, 5);

  const fallback = buildFallbackReport({
    periodLabel,
    total: items.length,
    positive,
    negative,
    neutral,
    channels,
    quotes,
  });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ report: fallback, organizationName });
  }

  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";
  const sampleLines = items
    .slice(0, 80)
    .map((item) => {
      const date = (item.reviewedAt ?? item.ingestedAt).toISOString().slice(0, 10);
      return `[${date}] (${item.sentiment ?? "NEUTRAL"}) ${item.channel}: ${item.content.slice(0, 220)}`;
    })
    .join("\n");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "LOOP Reports",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `You write Voice-of-Customer reports for product leaders. Return ONLY valid JSON with keys:
summary (string, 2-4 sentences),
themes (string array, 3-5 short theme titles),
recommendedActions (string array, 3-4 concrete next steps).
Do not invent metrics. Ground claims in the provided feedback.`,
          },
          {
            role: "user",
            content: `Organization: ${organizationName}
Period: ${periodLabel}
Counts — total: ${items.length}, positive: ${positive}, negative: ${negative}, neutral: ${neutral}
Top channels: ${channels.map((c) => `${c.name} (${c.count})`).join(", ") || "n/a"}

Feedback sample:
${sampleLines}`,
          },
        ],
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as OpenRouterResponse;
    if (!response.ok) {
      return NextResponse.json({ report: fallback, organizationName, warning: payload.error?.message });
    }

    const parsed = extractJsonObject(payload.choices?.[0]?.message?.content ?? "");
    if (!parsed) {
      return NextResponse.json({ report: fallback, organizationName });
    }

    const themes = Array.isArray(parsed.themes)
      ? parsed.themes.map(String).map((t) => t.slice(0, 120)).filter(Boolean).slice(0, 5)
      : fallback.themes;
    const recommendedActions = Array.isArray(parsed.recommendedActions)
      ? parsed.recommendedActions.map(String).map((t) => t.slice(0, 200)).filter(Boolean).slice(0, 4)
      : fallback.recommendedActions;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 1200)
        : fallback.summary;

    return NextResponse.json({
      report: { ...fallback, summary, themes, recommendedActions },
      organizationName,
    });
  } catch {
    return NextResponse.json({ report: fallback, organizationName });
  }
}
