import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireOrgOwner } from "@/lib/dashboard-session";
import { getGooglePlayOAuthUrl } from "@/lib/integrations/google-play/client";

export async function GET() {
  const { organizationId } = await requireOrgOwner();
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
