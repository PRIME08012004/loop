import prisma from "@/lib/db";
import { fetchGooglePlayReviews } from "@/lib/integrations/google-play/client";
import { ratingToSentiment } from "@/lib/integrations/google-play/map-review";
import { classifySentiment } from "@/lib/sentiment";

export async function pollGooglePlayIntegration(integrationId: string) {
  const integration = await prisma.appIntegration.findUnique({ where: { id: integrationId } });
  if (!integration?.packageName) throw new Error("Google Play package name is not configured.");

  const reviews = await fetchGooglePlayReviews(integrationId, integration.packageName);
  let created = 0;

  for (const review of reviews) {
    const existing = await prisma.feedbackItem.findUnique({
      where: {
        organizationId_source_externalId: {
          organizationId: integration.organizationId,
          source: "GOOGLE_PLAY",
          externalId: review.reviewId,
        },
      },
    });

    if (existing) continue;

    const sentiment = await classifySentiment(review.text, review.starRating);

    await prisma.feedbackItem.create({
      data: {
        organizationId: integration.organizationId,
        source: "GOOGLE_PLAY",
        externalId: review.reviewId,
        content: review.text,
        channel: "Google Play",
        rating: review.starRating ?? null,
        sentiment: sentiment ?? ratingToSentiment(review.starRating),
        status: "new",
        reviewedAt: review.reviewedAt ? new Date(review.reviewedAt) : null,
        rawPayload: review.raw as object,
      },
    });
    created += 1;
  }

  await prisma.appIntegration.update({
    where: { id: integrationId },
    data: { lastPolledAt: new Date(), lastPollError: null, status: "ACTIVE" },
  });

  return { fetched: reviews.length, created };
}

export async function pollAllGooglePlayIntegrations() {
  const integrations = await prisma.appIntegration.findMany({
    where: { provider: "GOOGLE_PLAY", status: { in: ["ACTIVE", "ERROR"] } },
  });

  const results = [];

  for (const integration of integrations) {
    try {
      const result = await pollGooglePlayIntegration(integration.id);
      results.push({ integrationId: integration.id, ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Poll failed.";
      await prisma.appIntegration.update({
        where: { id: integration.id },
        data: { status: "ERROR", lastPollError: message, lastPolledAt: new Date() },
      });
      results.push({ integrationId: integration.id, ok: false, error: message });
    }
  }

  return results;
}
