import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { assertPlanFeature, requireApiSession } from "@/lib/dashboard-session";
import prisma from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const planGate = assertPlanFeature(result.ctx, "shareChats");
  if ("error" in planGate) return planGate.error;

  const { id } = await params;
  const chat = await prisma.chat.findFirst({
    where: { id, userId: result.ctx.userId },
    select: { id: true, shareId: true },
  });
  if (!chat) return NextResponse.json({ error: "This chat was not found." }, { status: 404 });

  const shareId = chat.shareId ?? randomUUID();
  if (!chat.shareId) await prisma.chat.update({ where: { id }, data: { shareId } });
  return NextResponse.json({ shareId });
}

export async function DELETE(_request: Request, { params }: Context) {
  const result = await requireApiSession();
  if ("error" in result) return result.error;

  const { id } = await params;
  const updateResult = await prisma.chat.updateMany({
    where: { id, userId: result.ctx.userId },
    data: { shareId: null },
  });
  if (!updateResult.count) return NextResponse.json({ error: "This chat was not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
