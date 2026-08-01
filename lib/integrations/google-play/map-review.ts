export type GooglePlayReview = {
  reviewId: string;
  authorName?: string;
  starRating?: number;
  text: string;
  reviewedAt?: string;
  raw: unknown;
};

type GoogleReviewsResponse = {
  reviews?: Array<{
    reviewId?: string;
    authorName?: string;
    comments?: Array<{
      userComment?: {
        text?: string;
        starRating?: number;
        lastModified?: { seconds?: string };
      };
    }>;
  }>;
  tokenPagination?: { nextPageToken?: string };
};

export function mapGooglePlayReview(review: NonNullable<GoogleReviewsResponse["reviews"]>[number]): GooglePlayReview | null {
  const comment = review.comments?.[0]?.userComment;
  const text = comment?.text?.trim();
  if (!review.reviewId || !text) return null;

  const seconds = comment?.lastModified?.seconds;
  return {
    reviewId: review.reviewId,
    authorName: review.authorName,
    starRating: comment?.starRating,
    text,
    reviewedAt: seconds ? new Date(Number(seconds) * 1000).toISOString() : undefined,
    raw: review,
  };
}

export function ratingToSentiment(rating?: number): "POSITIVE" | "NEGATIVE" | "NEUTRAL" {
  if (!rating) return "NEUTRAL";
  if (rating >= 4) return "POSITIVE";
  if (rating <= 2) return "NEGATIVE";
  return "NEUTRAL";
}
