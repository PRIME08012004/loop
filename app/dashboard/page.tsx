import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardChat, { type StoredChat } from "@/components/dashboard-chat";
import prisma from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const storedChats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      sourceName: true,
      messages: { orderBy: { createdAt: "asc" }, take: 100, select: { id: true, role: true, content: true, chart: true } },
    },
  });
  const initialChats: StoredChat[] = storedChats.map((chat) => ({
    ...chat,
    messages: chat.messages.flatMap((message) =>
      message.role === "user" || message.role === "assistant"
        ? [{ id: message.id, role: message.role, content: message.content, chart: message.chart as StoredChat["messages"][number]["chart"] }]
        : [],
    ),
  }));

  return <DashboardChat userName={session.user.name ?? session.user.email ?? "there"} initialChats={initialChats} />;
}
