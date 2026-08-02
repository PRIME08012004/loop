import { getPlan, type PlanId } from "@/lib/plans";

export function analysisModelForPlan(plan: PlanId | string | null | undefined) {
  // Opt-in global override for debugging. Plan models are the default so Pro
  // customers get Claude while Beginner stays on Flash (protects margins).
  if (process.env.OPENROUTER_FORCE_MODEL === "1") {
    const override = process.env.OPENROUTER_MODEL?.trim();
    if (override) return override;
  }
  return getPlan(plan).analysisModel;
}

export function sentimentModelForPlan(plan: PlanId | string | null | undefined) {
  if (process.env.OPENROUTER_FORCE_MODEL === "1") {
    const override = process.env.OPENROUTER_SENTIMENT_MODEL?.trim() || process.env.OPENROUTER_MODEL?.trim();
    if (override) return override;
  }
  return getPlan(plan).sentimentModel;
}

export async function openRouterChat(options: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature?: number;
  maxTokens?: number;
  title?: string;
}) {
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
      "X-Title": options.title ?? "LOOP Analytics",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1200,
    }),
    cache: "no-store",
  });
}
