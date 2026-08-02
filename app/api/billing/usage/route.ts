import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/dashboard-session";
import { getPlanUsage } from "@/lib/plan-usage";

export const runtime = "nodejs";

export async function GET() {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const usage = await getPlanUsage(result.ctx.organizationId);
  return NextResponse.json({ usage });
}
