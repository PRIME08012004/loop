import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { canEditFeedbackStatus } from "@/lib/permissions";
import prisma from "@/lib/db";

const STATUSES = new Set(["new", "reviewed", "actioned"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organizationId, orgRole } = await requireDashboardSession();
  if (!canEditFeedbackStatus(orgRole)) {
    return NextResponse.json({ error: "You do not have permission to update feedback." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  const status = body.status;

  if (!status || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await prisma.feedbackItem.updateMany({
    where: { id, organizationId },
    data: { status: status as "new" | "reviewed" | "actioned" },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status });
}
