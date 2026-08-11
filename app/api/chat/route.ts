import { NextResponse } from "next/server";
import { analysisModelForPlan, openRouterChat, openRouterProviderError } from "@/lib/ai/openrouter";
import { askLoopSystemPrompt } from "@/lib/ai/prompts";
import { auth } from "@/lib/auth";
import { consumeAskLoopCredit } from "@/lib/billing";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
import prisma from "@/lib/db";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type Chart = {
  title: string;
  data: Array<{ label: string; value: number }>;
};

/** Pull a JSON string value for `answer` even when the object is truncated mid-string. */
function extractAnswerField(text: string): string | null {
  const marker = text.match(/"answer"\s*:\s*"/);
  if (!marker || marker.index === undefined) return null;

  let i = marker.index + marker[0].length;
  let out = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      const next = text[i + 1];
      if (next === undefined) break;
      if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === '"' || next === "\\" || next === "/") out += next;
      else if (next === "u" && /^[0-9a-fA-F]{4}/.test(text.slice(i + 2, i + 6))) {
        out += String.fromCharCode(Number.parseInt(text.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      } else out += next;
      i += 2;
      continue;
    }
    if (ch === '"') break;
    out += ch;
    i += 1;
  }

  const trimmed = out.trim();
  return trimmed ? trimmed : null;
}

function normalizeChart(rawChart: Record<string, unknown> | null | undefined): Chart | null {
  if (!rawChart || typeof rawChart !== "object") return null;
  const data = Array.isArray(rawChart.data)
    ? rawChart.data
        .slice(0, 6)
        .flatMap((item) => {
          const entry = item as Record<string, unknown>;
          const label = typeof entry.label === "string" ? entry.label.slice(0, 40) : "";
          const numericValue = Number(entry.value);
          return label && Number.isFinite(numericValue) && numericValue > 0 ? [{ label, value: numericValue }] : [];
        })
    : [];
  return typeof rawChart.title === "string" && data.length >= 2
    ? { title: rawChart.title.slice(0, 100), data }
    : null;
}

function parseReply(content: string): { answer: string; chart: Chart | null } {
  const cleaned = content.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end > start) {
    try {
      const value = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      const answer = typeof value.answer === "string" ? value.answer.trim() : "";
      if (answer) {
        return {
          answer,
          chart: normalizeChart(value.chart as Record<string, unknown> | null),
        };
      }
    } catch {
      // Fall through to salvage truncated / malformed JSON.
    }
  }

  const salvaged = extractAnswerField(cleaned) ?? extractAnswerField(content);
  if (salvaged) {
    return { answer: salvaged, chart: null };
  }

  // Strip obvious JSON wrapper noise so users never see ```json blobs.
  const stripped = cleaned
    .replace(/^\s*\{[\s\S]*"answer"\s*:\s*"/i, "")
    .replace(/"\s*,\s*"chart"[\s\S]*$/i, "")
    .replace(/"\s*\}\s*$/i, "")
    .trim();

  return {
    answer:
      stripped && !stripped.startsWith("{")
        ? stripped
        : "I could not create a readable answer. Please try asking again.",
    chart: null,
  };
}

function providerError(status: number, message?: string) {
  return openRouterProviderError(status, message);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to use LOOP." }, { status: 401 });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI chat is not configured. Add OPENROUTER_API_KEY to your environment." }, { status: 503 });
  }

  const orgResult = await requireApiSession();
  if ("error" in orgResult) return orgResult.error;

  const planGate = assertPlanFeature(orgResult.ctx, "ask");
  if ("error" in planGate) return planGate.error;

  const organization = await prisma.organization.findUnique({
    where: { id: orgResult.ctx.organizationId },
    select: { plan: true },
  });
  const plan = (organization?.plan ?? "FREE") as PlanId;

  const credit = await consumeAskLoopCredit(orgResult.ctx.organizationId, plan);
  if (!credit.ok) {
    return NextResponse.json({ error: credit.reason }, { status: 402 });
  }

  const body = (await request.json()) as { messages?: unknown; sourceName?: unknown; feedbackContext?: unknown; chatId?: unknown };
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Messages are required." }, { status: 400 });
  }

  const messages = body.messages
    .slice(-12)
    .flatMap((message): ChatMessage[] => {
      if (!message || typeof message !== "object") return [];
      const item = message as Record<string, unknown>;
      if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return [];
      const content = item.content.trim().slice(0, 4000);
      return content ? [{ role: item.role, content }] : [];
    });

  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Send a question for LOOP to answer." }, { status: 400 });
  }

  const sourceName = typeof body.sourceName === "string" ? body.sourceName.slice(0, 200) : "feedback source";
  const feedbackContext = typeof body.feedbackContext === "string" ? body.feedbackContext.slice(0, 12000) : "No feedback records were supplied.";
  const model = analysisModelForPlan(plan);
  const latestQuestion = messages.at(-1)?.content ?? "New chat";
  let chatId = typeof body.chatId === "string" ? body.chatId : undefined;

  if (chatId) {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: session.user.id }, select: { id: true } });
    if (!chat) return NextResponse.json({ error: "This chat was not found." }, { status: 404 });
  } else {
    const chat = await prisma.chat.create({
      data: { userId: session.user.id, title: latestQuestion.slice(0, 80), sourceName },
      select: { id: true },
    });
    chatId = chat.id;
  }

  await prisma.chatMessage.create({ data: { chatId, role: "user", content: latestQuestion } });

  let response = await openRouterChat({
    apiKey,
    model,
    title: "LOOP Analytics",
    temperature: 0.25,
    maxTokens: 2200,
    jsonMode: true,
    messages: [
      {
        role: "system",
        content: askLoopSystemPrompt(sourceName, feedbackContext),
      },
      ...messages,
    ],
  });

  let payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    const detail = payload.error?.message?.toLowerCase() ?? "";
    const jsonModeRejected =
      detail.includes("response_format") ||
      detail.includes("json_object") ||
      detail.includes("json mode");
    if (jsonModeRejected) {
      response = await openRouterChat({
        apiKey,
        model,
        title: "LOOP Analytics",
        temperature: 0.25,
        maxTokens: 2200,
        messages: [
          {
            role: "system",
            content: askLoopSystemPrompt(sourceName, feedbackContext),
          },
          ...messages,
        ],
      });
      payload = (await response.json()) as OpenRouterResponse;
    }
  }

  if (!response.ok) {
    console.error("OpenRouter chat request failed", { status: response.status, message: payload.error?.message, model });
    return NextResponse.json({ error: providerError(response.status, payload.error?.message) }, { status: response.status });
  }

  const reply = payload.choices?.[0]?.message?.content;
  if (!reply) return NextResponse.json({ error: "LOOP returned an empty response. Please try again." }, { status: 502 });

  const result = parseReply(reply);
  await prisma.chatMessage.create({
    data: { chatId, role: "assistant", content: result.answer, chart: result.chart ?? undefined },
  });
  await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date(), sourceName } });

  return NextResponse.json({ ...result, chatId, usage: { used: credit.used, limit: credit.limit } });
}
