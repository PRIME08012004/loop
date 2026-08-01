import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSecret } from "@/lib/crypto/tokens";
import prisma from "@/lib/db";
import { exchangeGooglePlayCode } from "@/lib/integrations/google-play/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${process.env.AUTH_URL}/dashboard/settings/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.AUTH_URL}/dashboard/settings/integrations?error=missing_code`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("loop-gp-oauth-state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${process.env.AUTH_URL}/dashboard/settings/integrations?error=invalid_state`);
  }

  let organizationId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { organizationId?: string };
    if (!parsed.organizationId) throw new Error("missing org");
    organizationId = parsed.organizationId;
  } catch {
    return NextResponse.redirect(`${process.env.AUTH_URL}/dashboard/settings/integrations?error=invalid_state`);
  }

  try {
    const tokens = await exchangeGooglePlayCode(code);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.appIntegration.upsert({
      where: {
        organizationId_provider: { organizationId, provider: "GOOGLE_PLAY" },
      },
      create: {
        organizationId,
        provider: "GOOGLE_PLAY",
        accessToken: encryptSecret(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
        tokenExpiresAt,
        status: "ACTIVE",
      },
      update: {
        accessToken: encryptSecret(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
        tokenExpiresAt,
        status: "ACTIVE",
        lastPollError: null,
      },
    });

    const response = NextResponse.redirect(`${process.env.AUTH_URL}/dashboard/settings/integrations?connected=google_play`);
    response.cookies.delete("loop-gp-oauth-state");
    return response;
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "oauth_failed";
    return NextResponse.redirect(`${process.env.AUTH_URL}/dashboard/settings/integrations?error=${encodeURIComponent(message)}`);
  }
}
