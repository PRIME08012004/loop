import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const chat = await prisma.chat.findFirst({ where: { id, userId: session.user.id }, select: { id: true, shareId: true } });
  if (!chat) return NextResponse.json({ error: "This chat was not found." }, { status: 404 });

  const shareId = chat.shareId ?? randomUUID();
  if (!chat.shareId) await prisma.chat.update({ where: { id }, data: { shareId } });
  return NextResponse.json({ shareId });
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await params;
  const result = await prisma.chat.updateMany({ where: { id, userId: session.user.id }, data: { shareId: null } });
  if (!result.count) return NextResponse.json({ error: "This chat was not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
