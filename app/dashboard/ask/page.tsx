import AskLoopChat, { type StoredChat } from "@/components/ask-loop-chat";
import { requireDashboardSession } from "@/lib/dashboard-session";
import prisma from "@/lib/db";

export default async function AskPage() {
  const { userId, userName, organizationId } = await requireDashboardSession();

  const [storedChats, orgFeedback] = await Promise.all([
    prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        sourceName: true,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
          select: { id: true, role: true, content: true, chart: true },
        },
      },
    }),
    prisma.feedbackItem.findMany({
      where: { organizationId },
      orderBy: { ingestedAt: "desc" },
      take: 100,
      select: { content: true, channel: true, reviewedAt: true, ingestedAt: true },
    }),
  ]);

  const initialChats: StoredChat[] = storedChats.map((chat) => ({
    ...chat,
    messages: chat.messages.flatMap((message) =>
      message.role === "user" || message.role === "assistant"
        ? [
            {
              id: message.id,
              role: message.role,
              content: message.content,
              chart: message.chart as StoredChat["messages"][number]["chart"],
            },
          ]
        : [],
    ),
  }));

  const initialOrgFeedback = orgFeedback.map((item) => ({
    content: item.content,
    channel: item.channel,
    createdAt: (item.reviewedAt ?? item.ingestedAt).toISOString(),
  }));

  return (
    <AskLoopChat
      userName={userName}
      initialChats={initialChats}
      initialOrgFeedback={initialOrgFeedback}
      initialSourceName="Organization feedback"
    />
  );
}
