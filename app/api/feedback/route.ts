import { NextResponse } from "next/server";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
import { getOrgFeedback } from "@/lib/feedback-query";
import { getPlan } from "@/lib/plans";
import { parseCsv } from "@/lib/parse-csv";
import prisma from "@/lib/db";
import { quickSentiment } from "@/lib/sentiment";

const MAX_CSV_ROWS = 300;

export async function GET() {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const feedback = await getOrgFeedback(result.ctx.organizationId, 200);
  return NextResponse.json({ feedback });
}

export async function POST(request: Request) {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const planGate = assertPlanFeature(result.ctx, "inbox");
  if ("error" in planGate) return planGate.error;

  const { organizationId, effectivePlan } = result.ctx;
  const feedbackLimit = getPlan(effectivePlan).limits.feedbackItems;
  const currentCount = await prisma.feedbackItem.count({ where: { organizationId } });
  const remaining = Math.max(0, feedbackLimit - currentCount);
  if (remaining <= 0) {
    return NextResponse.json(
      {
        error: `Your ${getPlan(effectivePlan).name} plan allows ${feedbackLimit} feedback items. Delete older items or upgrade to add more.`,
        upgradeUrl: "/dashboard/settings#billing",
      },
      { status: 402 },
    );
  }

  const body = (await request.json()) as { csv?: string; sourceName?: string };

  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
  }

  const parsed = parseCsv(csv);
  const rows = parsed.slice(0, Math.min(MAX_CSV_ROWS, remaining));
  if (!rows.length) {
    return NextResponse.json({ error: "No feedback rows found in CSV." }, { status: 400 });
  }

  const data = rows.map((row) => {
    const externalId = `csv-${Buffer.from(`${row.content}|${row.channel}|${row.createdAt}`)
      .toString("base64url")
      .slice(0, 64)}`;
    return {
      organizationId,
      source: "CSV" as const,
      externalId,
      content: row.content.slice(0, 8000),
      channel: row.channel.slice(0, 120),
      sentiment: quickSentiment(row.content),
      status: "new" as const,
      reviewedAt: new Date(row.createdAt),
    };
  });

  await prisma.feedbackItem.createMany({
    data,
    skipDuplicates: true,
  });

  const feedback = await getOrgFeedback(organizationId, 200);
  return NextResponse.json({
    created: data.length,
    truncated: parsed.length > rows.length,
    feedback,
    sourceName: body.sourceName ?? "Pasted CSV",
  });
}
