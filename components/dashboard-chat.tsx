"use client";

import {
  IconArrowUp,
  IconCheck,
  IconChartPie,
  IconFileText,
  IconLoader2,
  IconLogout,
  IconMessageCircle,
  IconMoon,
  IconPaperclip,
  IconPlus,
  IconSparkles,
  IconShare3,
  IconSun,
  IconX,
} from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

type FeedbackItem = {
  content: string;
  channel: string;
  createdAt: string;
};

type Chart = {
  title: string;
  data: Array<{ label: string; value: number }>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chart?: Chart | null;
};

export type StoredChat = {
  id: string;
  title: string;
  sourceName: string | null;
  messages: ChatMessage[];
};

const SAMPLE_FEEDBACK: Array<{ content: string; channel: string; daysAgo: number }> = [
  { content: "Onboarding took forever. I could not figure out how to invite my team.", channel: "Support ticket", daysAgo: 1 },
  { content: "The new dashboard is gorgeous and much faster than before.", channel: "App store", daysAgo: 2 },
  { content: "The mobile experience needs work. Buttons are too small on my phone.", channel: "NPS survey", daysAgo: 2 },
  { content: "Billing keeps timing out when I download an invoice.", channel: "Support ticket", daysAgo: 4 },
  { content: "The Slack integration works great now.", channel: "Community", daysAgo: 5 },
  { content: "We were charged twice this month. Please fix billing.", channel: "Sales note", daysAgo: 6 },
  { content: "Support was fast and helpful resolving my ticket.", channel: "Support ticket", daysAgo: 6 },
  { content: "The Android app feels slow and keeps loading.", channel: "App store", daysAgo: 7 },
  { content: "SSO setup instructions are unclear for new team members.", channel: "Support ticket", daysAgo: 9 },
  { content: "Love the export feature. It saved me an hour today.", channel: "Community", daysAgo: 10 },
  { content: "The mobile app crashes when I open reports.", channel: "App store", daysAgo: 11 },
  { content: "Setup was smooth this time. Very easy to get started.", channel: "NPS survey", daysAgo: 12 },
];

const PIE_COLORS = ["#111827", "#4b5563", "#9ca3af", "#d1d5db", "#6b7280", "#e5e7eb"];

function makeId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function buildSampleFeedback() {
  return SAMPLE_FEEDBACK.map((item) => {
    const date = new Date();
    date.setDate(date.getDate() - item.daysAgo);
    return { content: item.content, channel: item.channel, createdAt: date.toISOString() };
  });
}

function parseCsv(text: string): FeedbackItem[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  if (!text.includes(",")) {
    return lines.map((content) => ({ content: content.trim(), channel: "Uploaded file", createdAt: new Date().toISOString() })).filter((item) => item.content);
  }
  const header = lines[0].toLowerCase().split(",").map((item) => item.trim());
  const contentIndex = header.findIndex((item) => item.includes("content") || item.includes("feedback") || item.includes("message"));
  const channelIndex = header.findIndex((item) => item.includes("channel") || item.includes("source"));
  const dateIndex = header.findIndex((item) => item.includes("date") || item.includes("created"));
  const rows = contentIndex >= 0 ? lines.slice(1) : lines;

  return rows.flatMap((line) => {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const content = cells[contentIndex >= 0 ? contentIndex : 0];
    if (!content) return [];
    const suppliedDate = cells[dateIndex];
    return [{
      content,
      channel: cells[channelIndex] || "Uploaded feedback",
      createdAt: suppliedDate && !Number.isNaN(Date.parse(suppliedDate)) ? new Date(suppliedDate).toISOString() : new Date().toISOString(),
    }];
  });
}

function PieChart({ chart }: { chart: Chart }) {
  const total = chart.data.reduce((sum, item) => sum + item.value, 0);
  const stops = chart.data.map((item, index) => {
    const precedingTotal = chart.data.slice(0, index).reduce((sum, previous) => sum + previous.value, 0);
    const start = (precedingTotal / total) * 100;
    const end = ((precedingTotal + item.value) / total) * 100;
    return `${PIE_COLORS[index % PIE_COLORS.length]} ${start}% ${end}%`;
  });

  return (
    <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-sm font-medium">
        <IconChartPie size={17} /> {chart.title}
      </div>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-label={chart.title} />
        <ul className="w-full space-y-2 text-sm">
          {chart.data.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
              <span className="flex-1 text-neutral-600 dark:text-neutral-300">{item.label}</span>
              <span className="font-medium">{item.value} ({Math.round((item.value / total) * 100)}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function DashboardChat({ userName, initialChats }: { userName: string; initialChats: StoredChat[] }) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>(buildSampleFeedback);
  const [sourceName, setSourceName] = useState("Sample feedback");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<StoredChat[]>(initialChats);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadChats() {
    const response = await fetch("/api/chats");
    if (!response.ok) return;
    const payload = (await response.json()) as { chats?: StoredChat[] };
    setChats(payload.chats ?? []);
  }

  const resetChat = () => {
    setMessages([]);
    setChatId(null);
    setError(null);
    setInput("");
  };

  const sendMessage = async (
    question: string,
    contextFeedback = feedback,
    contextSourceName = sourceName,
    previousMessages = messages,
  ) => {
    if (!question || isSending) return;
    const userMessage: ChatMessage = { id: makeId(), role: "user", content: question };
    const conversation = [...previousMessages, userMessage];
    const feedbackContext = contextFeedback
      .slice(0, 30)
      .map((item) => `[${item.createdAt.slice(0, 10)}] ${item.channel}: ${item.content}`)
      .join("\n");

    setMessages(conversation);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          sourceName: contextSourceName,
          feedbackContext,
          messages: conversation.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = (await response.json()) as { answer?: string; chart?: Chart | null; chatId?: string; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error ?? "LOOP could not answer right now.");
      const answer = payload.answer;
      setMessages((previous) => [...previous, { id: makeId(), role: "assistant", content: answer, chart: payload.chart }]);
      if (payload.chatId) setChatId(payload.chatId);
      void loadChats();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "LOOP could not answer right now.");
    } finally {
      setIsSending(false);
    }
  };

  const uploadFeedback = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsReadingFile(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const uploaded = parseCsv(String(reader.result ?? ""));
      if (uploaded.length) {
        setFeedback(uploaded);
        setSourceName(file.name);
        setAttachmentName(file.name);
      } else {
        setError("I could not find any feedback text in that CSV. Try a file with a content or feedback column.");
      }
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setError("I could not read that file. Please try a CSV, TXT, or Markdown file.");
      setIsReadingFile(false);
    };
    reader.readAsText(file);
  };

  const removeAttachment = () => {
    setAttachmentName(null);
    setSourceName("Sample feedback");
    setFeedback(buildSampleFeedback());
  };

  const shareChat = async () => {
    if (!chatId) return;
    try {
      const response = await fetch(`/api/chats/${chatId}/share`, { method: "POST" });
      const payload = (await response.json()) as { shareId?: string; error?: string };
      if (!response.ok || !payload.shareId) throw new Error(payload.error ?? "Could not create a share link.");
      await navigator.clipboard.writeText(`${window.location.origin}/share/${payload.shareId}`);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2000);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Could not create a share link.");
    }
  };

  const askLoop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    await sendMessage(question);
  };

  const pageClass = isDark ? "dark bg-[#212121] text-[#ececec]" : "bg-white text-neutral-900";
  const suggestions = ["What are customers struggling with most?", "Show me the biggest themes as a pie chart", "What should my team fix first?"];

  return (
    <main className={`min-h-screen ${pageClass}`}>
      <input ref={fileInputRef} type="file" accept=".csv,.txt,.md,text/csv,text/plain,text/markdown" onChange={uploadFeedback} className="hidden" />
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-100 p-3 dark:border-neutral-800 dark:bg-[#171717] md:flex">
          <button onClick={resetChat} className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
            <IconPlus size={18} /> New chat
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-neutral-600 transition hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <IconPaperclip size={18} /> Upload feedback
          </button>
          <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Current data</p>
            <div className="mt-2 flex items-start gap-3 rounded-lg px-3 py-2 text-sm">
              <IconFileText size={17} className="mt-0.5 shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1 truncate">{sourceName}</span>
            </div>
            <p className="px-3 text-xs text-neutral-500">{feedback.length} feedback responses</p>
          </div>
          {chats.length > 0 && (
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <p className="px-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Your chats</p>
              <div className="mt-2 space-y-1">
                {chats.map((chat) => (
                  <button key={chat.id} onClick={() => { setChatId(chat.id); setMessages(chat.messages); setError(null); }} className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition hover:bg-neutral-200 dark:hover:bg-neutral-800 ${chat.id === chatId ? "bg-neutral-200 dark:bg-neutral-800" : ""}`}>
                    {chat.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-auto border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-500 transition hover:bg-neutral-200 dark:hover:bg-neutral-800">
              <IconLogout size={17} /> Log out
            </button>
            <div className="mt-2 flex items-center justify-between px-3 py-2 text-sm text-neutral-500">
              <span className="flex items-center gap-2"><IconSparkles size={16} /> LOOP</span>
              <button onClick={() => setIsDark((value) => !value)} aria-label="Toggle theme" className="rounded-md p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800">
                {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="relative flex h-14 items-center justify-center border-b border-neutral-200 px-4 dark:border-neutral-800">
            <span className="flex items-center gap-2 font-medium"><IconSparkles size={18} /> LOOP</span>
            <div className="absolute right-4 flex items-center gap-2">
              {chatId && <button onClick={shareChat} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800">{shareStatus === "copied" ? <IconCheck size={16} /> : <IconShare3 size={16} />}{shareStatus === "copied" ? "Copied" : "Share"}</button>}
              <button onClick={() => fileInputRef.current?.click()} className="text-sm text-neutral-500 md:hidden">Upload</button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-40 pt-10 sm:px-8">
              {messages.length === 0 ? (
                <div className="flex min-h-[48vh] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"><IconMessageCircle size={24} /></div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What would you like to understand, {userName.split(" ")[0]}?</h1>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-neutral-500 dark:text-neutral-400">Ask LOOP anything about your customer feedback. You will get a plain-English answer and a chart whenever it makes the answer clearer.</p>
                  <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                    {suggestions.map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)} className="rounded-xl border border-neutral-200 p-3 text-left text-sm text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">{suggestion}</button>)}
                  </div>
                </div>
              ) : (
                <div className="space-y-7">
                  {messages.map((message) => (
                    <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"><IconSparkles size={15} /></div>}
                      <div className={`max-w-[90%] ${message.role === "user" ? "rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800" : "flex-1"}`}>
                        <p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>
                        {message.chart && <PieChart chart={message.chart} />}
                      </div>
                    </article>
                  ))}
                  {isSending && <div className="flex items-center gap-3"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"><IconSparkles size={15} /></div><IconLoader2 size={18} className="animate-spin text-neutral-500" /></div>}
                </div>
              )}
              {error && <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><span className="flex-1">{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><IconX size={16} /></button></div>}
            </div>
          </div>

          <div
            className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-10 md:left-64"
            style={{ backgroundImage: `linear-gradient(to top, ${isDark ? "#212121 72%, #212121 45%, transparent" : "#ffffff 72%, #ffffff 45%, transparent"})` }}
          >
            <form onSubmit={askLoop} className="mx-auto flex max-w-3xl flex-col rounded-2xl border border-neutral-300 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-[#303030]">
              {attachmentName && (
                <div className="mb-1 flex w-fit max-w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <IconFileText size={16} className="shrink-0 text-neutral-500" />
                  <span className="truncate">{attachmentName}</span>
                  <button type="button" onClick={removeAttachment} aria-label="Remove attached file" className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"><IconX size={14} /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSending || isReadingFile} aria-label="Attach feedback file" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-700">
                  {isReadingFile ? <IconLoader2 size={18} className="animate-spin" /> : <IconPaperclip size={18} />}
                </button>
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} disabled={isSending || isReadingFile} rows={1} placeholder={attachmentName ? "Ask about this file…" : "Message LOOP"} className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-neutral-500 disabled:opacity-60" />
                <button type="submit" disabled={!input.trim() || isSending || isReadingFile} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-white dark:text-neutral-950"><IconArrowUp size={19} /></button>
              </div>
            </form>
            <p className="mt-2 text-center text-xs text-neutral-500">LOOP can make mistakes. Check important information.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
