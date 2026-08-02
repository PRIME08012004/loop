import { NextResponse } from "next/server";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
import { getOrgFeedback } from "@/lib/feedback-query";
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

  const { organizationId } = result.ctx;
  const body = (await request.json()) as { csv?: string; sourceName?: string };

  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
  }

  const rows = parseCsv(csv).slice(0, MAX_CSV_ROWS);
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

  // Fast bulk insert — skip duplicates instead of classifying each row with AI
  await prisma.feedbackItem.createMany({
    data,
    skipDuplicates: true,
  });

  const feedback = await getOrgFeedback(organizationId, 200);
  return NextResponse.json({
    created: data.length,
    feedback,
    sourceName: body.sourceName ?? "Pasted CSV",
  });
}
