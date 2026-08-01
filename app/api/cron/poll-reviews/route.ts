import { NextResponse } from "next/server";
import { pollAllGooglePlayIntegrations } from "@/lib/integrations/poll";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await pollAllGooglePlayIntegrations();
  return NextResponse.json({ ok: true, results, polledAt: new Date().toISOString() });
}
