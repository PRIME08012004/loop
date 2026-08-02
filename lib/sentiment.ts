import { ratingToSentiment } from "@/lib/integrations/google-play/map-review";
import { sentimentModelForPlan } from "@/lib/ai/openrouter";
import { sentimentSystemPrompt } from "@/lib/ai/prompts";
import type { PlanId } from "@/lib/plans";

type Sentiment = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const POSITIVE_WORDS =
  /\b(love|great|amazing|excellent|awesome|good|happy|fast|easy|helpful|perfect|fantastic|smooth|thanks|thank you)\b/i;
const NEGATIVE_WORDS =
  /\b(hate|terrible|awful|slow|bug|crash|broken|bad|poor|frustrating|confusing|expensive|never|worst|issue|problem|fail)\b/i;

function parseSentiment(text: string): Sentiment | null {
  const normalized = text.trim().toUpperCase();
  if (normalized.includes("POSITIVE")) return "POSITIVE";
  if (normalized.includes("NEGATIVE")) return "NEGATIVE";
  if (normalized.includes("NEUTRAL")) return "NEUTRAL";
  return null;
}

/** Fast local heuristic for bulk CSV ingest — no network. */
export function quickSentiment(content: string, rating?: number | null): Sentiment {
  if (rating != null) return ratingToSentiment(rating);
  const positive = POSITIVE_WORDS.test(content);
  const negative = NEGATIVE_WORDS.test(content);
  if (positive && !negative) return "POSITIVE";
  if (negative && !positive) return "NEGATIVE";
  return "NEUTRAL";
}

export async function classifySentiment(
  content: string,
  rating?: number | null,
  plan: PlanId = "FREE",
): Promise<Sentiment> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return quickSentiment(content, rating);

  const model = sentimentModelForPlan(plan);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "LOOP Sentiment",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: sentimentSystemPrompt(),
          },
          {
            role: "user",
            content: `Rating: ${rating ?? "unknown"}\nFeedback: ${content.slice(0, 1500)}`,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json()) as OpenRouterResponse;
    const reply = payload.choices?.[0]?.message?.content ?? "";
    return parseSentiment(reply) ?? quickSentiment(content, rating);
  } catch {
    return quickSentiment(content, rating);
  } finally {
    clearTimeout(timeout);
  }
}
