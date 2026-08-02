import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireOrgOwner } from "@/lib/dashboard-session";
import { getGooglePlayOAuthUrl } from "@/lib/integrations/google-play/client";
import { canAccessFeature } from "@/lib/plans";

export async function GET() {
  const { organizationId, plan, planExpiresAt } = await requireOrgOwner();
  if (!canAccessFeature(plan, planExpiresAt, "integrations")) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?error=upgrade_for_integrations", process.env.AUTH_URL ?? "http://localhost:3000"),
    );
  }

  const state = Buffer.from(JSON.stringify({ organizationId, nonce: randomBytes(16).toString("hex") })).toString("base64url");

  const response = NextResponse.redirect(getGooglePlayOAuthUrl(state));
  response.cookies.set("loop-gp-oauth-state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
