import prisma from "@/lib/db";
import type { FeedbackRow, Sentiment } from "@/lib/feedback-types";

function mapSentiment(value: string | null): Sentiment {
  if (value === "POSITIVE") return "Positive";
  if (value === "NEGATIVE") return "Negative";
  return "Neutral";
}

export async function getOrgFeedback(organizationId: string, limit = 100) {
  const items = await prisma.feedbackItem.findMany({
    where: { organizationId },
    orderBy: { ingestedAt: "desc" },
    take: limit,
  });

  return items.map(
    (item): FeedbackRow => ({
      id: item.id,
      content: item.content,
      channel: item.channel,
      sentiment: mapSentiment(item.sentiment),
      status: item.status,
      createdAt: (item.reviewedAt ?? item.ingestedAt).toISOString().slice(0, 10),
    }),
  );
}

export function feedbackToContext(rows: Array<{ content: string; channel: string; reviewedAt?: Date | null; ingestedAt: Date }>) {
  return rows
    .map((item) => {
      const date = (item.reviewedAt ?? item.ingestedAt).toISOString().slice(0, 10);
      return `[${date}] ${item.channel}: ${item.content}`;
    })
    .join("\n");
}
