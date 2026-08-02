import { NextResponse } from "next/server";
import { analysisModelForPlan, openRouterChat } from "@/lib/ai/openrouter";
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

function parseReply(content: string): { answer: string; chart: Chart | null } {
  const cleaned = content.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) return { answer: content.trim(), chart: null };

  try {
    const value = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    const answer = typeof value.answer === "string" ? value.answer.trim() : content.trim();
    const rawChart = value.chart as Record<string, unknown> | null;
    const data = Array.isArray(rawChart?.data)
      ? rawChart.data
          .slice(0, 6)
          .flatMap((item) => {
            const entry = item as Record<string, unknown>;
            const label = typeof entry.label === "string" ? entry.label.slice(0, 40) : "";
            const numericValue = Number(entry.value);
            return label && Number.isFinite(numericValue) && numericValue > 0 ? [{ label, value: numericValue }] : [];
          })
      : [];

    return {
      answer: answer || "I could not create a readable answer. Please try asking in a different way.",
      chart: typeof rawChart?.title === "string" && data.length >= 2 ? { title: rawChart.title.slice(0, 100), data } : null,
    };
  } catch {
    return { answer: content.trim(), chart: null };
  }
}

function providerError(status: number, message?: string) {
  const detail = message?.toLowerCase() ?? "";
  if (status === 401 || status === 403) return "The AI connection could not be verified. Check OPENROUTER_API_KEY.";
  if (status === 429 || detail.includes("rate limit")) return "LOOP is temporarily busy. Please try again in a moment.";
  if (status === 402 || detail.includes("credits")) return "The configured AI model is unavailable for this account.";
  return "LOOP could not respond right now. Please try again.";
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

  const response = await openRouterChat({
    apiKey,
    model,
    title: "LOOP Analytics",
    temperature: 0.25,
    maxTokens: 1100,
    messages: [
      {
        role: "system",
        content: askLoopSystemPrompt(sourceName, feedbackContext),
      },
      ...messages,
    ],
  });

  const payload = (await response.json()) as OpenRouterResponse;
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
