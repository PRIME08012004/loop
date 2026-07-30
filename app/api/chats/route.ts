import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const chats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      sourceName: true,
      updatedAt: true,
      messages: { orderBy: { createdAt: "asc" }, take: 100, select: { id: true, role: true, content: true, chart: true } },
    },
  });

  return NextResponse.json({ chats });
}
