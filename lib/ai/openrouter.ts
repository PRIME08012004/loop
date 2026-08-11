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
  /** Prefer JSON object responses when the model supports it. */
  jsonMode?: boolean;
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
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
  });
}

/** Map OpenRouter HTTP failures to clear, actionable UI copy. */
export function openRouterProviderError(status: number, message?: string) {
  const detail = message?.toLowerCase() ?? "";

  if (status === 401 || status === 403 || detail.includes("user not found") || detail.includes("invalid api key")) {
    return "OpenRouter rejected the API key (invalid, expired, revoked, or a management key). Create a new inference key at openrouter.ai/settings/keys and update OPENROUTER_API_KEY.";
  }

  if (status === 402 || detail.includes("credit") || detail.includes("afford")) {
    return "OpenRouter has insufficient credits for this model. Add credits at openrouter.ai/settings/credits, or switch FREE/BEGINNER plans to a free-tier model.";
  }

  if (status === 429 || detail.includes("rate limit")) {
    return "LOOP is temporarily busy. Please try again in a moment.";
  }

  if (status === 404 || detail.includes("no endpoints") || detail.includes("not found")) {
    return "The configured AI model is not available on OpenRouter right now. Try again later or change OPENROUTER_MODEL.";
  }

  return "LOOP could not respond right now. Please try again.";
}
