import { notFound } from "next/navigation";
import prisma from "@/lib/db";

export default async function SharedChatPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const chat = await prisma.chat.findUnique({
    where: { shareId },
    select: { title: true, sourceName: true, messages: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true } } },
  });
  if (!chat) notFound();

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-12 text-neutral-100">
      <article className="mx-auto max-w-3xl">
        <p className="text-sm font-medium tracking-widest text-neutral-500">SHARED FROM LOOP</p>
        <h1 className="mt-3 text-2xl font-semibold">{chat.title}</h1>
        {chat.sourceName && <p className="mt-2 text-sm text-neutral-400">Feedback source: {chat.sourceName}</p>}
        <div className="mt-8 space-y-5">
          {chat.messages.map((message) => (
            <div key={message.id} className={`rounded-2xl p-4 text-[15px] leading-7 ${message.role === "user" ? "ml-auto max-w-[85%] bg-neutral-800" : "border border-neutral-800 bg-neutral-900"}`}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">{message.role === "user" ? "You" : "LOOP"}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
        </div>
      </article>
    </main>
  );
}
