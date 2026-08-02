import { NextResponse } from "next/server";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { canEditFeedbackStatus } from "@/lib/permissions";
import { canAccessFeature } from "@/lib/plans";
import prisma from "@/lib/db";

const STATUSES = new Set(["new", "reviewed", "actioned"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireDashboardSession();
  const { organizationId, orgRole, plan, planExpiresAt } = ctx;
  if (!canAccessFeature(plan, planExpiresAt, "inbox")) {
    return NextResponse.json(
      { error: "Upgrade your plan to manage inbox items.", upgradeUrl: "/dashboard/settings#billing" },
      { status: 402 },
    );
  }
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
