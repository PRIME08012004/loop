import { decryptSecret, encryptSecret } from "@/lib/crypto/tokens";
import prisma from "@/lib/db";
import { mapGooglePlayReview } from "@/lib/integrations/google-play/map-review";

const PLAY_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVIEWS_URL = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

export function getGooglePlayOAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_PLAY_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  const redirectUri = `${process.env.AUTH_URL}/api/integrations/google-play/callback`;
  if (!clientId) throw new Error("GOOGLE_PLAY_CLIENT_ID is not configured.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: PLAY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGooglePlayCode(code: string) {
  const clientId = process.env.GOOGLE_PLAY_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_PLAY_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;
  const redirectUri = `${process.env.AUTH_URL}/api/integrations/google-play/callback`;
  if (!clientId || !clientSecret) throw new Error("Google Play OAuth is not configured.");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Google token exchange failed.");
  }
  return payload;
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_PLAY_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_PLAY_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google Play OAuth is not configured.");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Google token refresh failed.");
  }
  return payload;
}

export async function getValidAccessToken(integrationId: string) {
  const integration = await prisma.appIntegration.findUnique({ where: { id: integrationId } });
  if (!integration?.refreshToken) throw new Error("Integration has no refresh token.");

  const refreshToken = decryptSecret(integration.refreshToken);
  const stillValid =
    integration.accessToken &&
    integration.tokenExpiresAt &&
    integration.tokenExpiresAt.getTime() - Date.now() > 60_000;

  if (stillValid && integration.accessToken) {
    return decryptSecret(integration.accessToken);
  }

  const tokens = await refreshAccessToken(refreshToken);
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.appIntegration.update({
    where: { id: integrationId },
    data: {
      accessToken: encryptSecret(tokens.access_token),
      tokenExpiresAt,
      refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : integration.refreshToken,
      status: "ACTIVE",
      lastPollError: null,
    },
  });

  return tokens.access_token;
}

export async function fetchGooglePlayReviews(integrationId: string, packageName: string) {
  const accessToken = await getValidAccessToken(integrationId);
  const reviews = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${REVIEWS_URL}/${encodeURIComponent(packageName)}/reviews`);
    if (pageToken) url.searchParams.set("token", pageToken);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Google Play API error ${response.status}: ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      reviews?: unknown[];
      tokenPagination?: { nextPageToken?: string };
    };

    for (const item of payload.reviews ?? []) {
      const mapped = mapGooglePlayReview(item as Parameters<typeof mapGooglePlayReview>[0]);
      if (mapped) reviews.push(mapped);
    }

    pageToken = payload.tokenPagination?.nextPageToken;
  } while (pageToken);

  return reviews;
}
