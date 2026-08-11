"use client";

import {
  IconArrowUp,
  IconCheck,
  IconChartPie,
  IconClipboard,
  IconFileText,
  IconLoader2,
  IconMessageCircle,
  IconPaperclip,
  IconPlus,
  IconShare3,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  buildFeedbackContext,
  MAX_ASK_CSV_ROWS,
  parseCsv,
  type ParsedFeedbackRow,
} from "@/lib/parse-csv";

const MAX_ASK_FILE_BYTES = 2 * 1024 * 1024;

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

const PIE_COLORS = ["#10b981", "#f43f5e", "#f59e0b", "#6366f1", "#94a3b8", "#e2e8f0"];

const CSV_EXAMPLE = `content,channel,date
Onboarding took forever to invite my team,Support,2026-07-30
New dashboard is gorgeous and fast,App store,2026-07-29
Mobile experience needs work,NPS,2026-07-28`;

function makeId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
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
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-sm font-medium">
        <IconChartPie size={17} /> {chart.title}
      </div>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <div className="h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }} aria-label={chart.title} />
        <ul className="w-full space-y-2 text-sm">
          {chart.data.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
              <span className="flex-1 text-slate-600 dark:text-slate-300">{item.label}</span>
              <span className="font-medium">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function AskLoopChat({
  userName,
  initialChats,
  initialOrgFeedback = [],
  initialSourceName = "Organization feedback",
}: {
  userName: string;
  initialChats: StoredChat[];
  initialOrgFeedback?: ParsedFeedbackRow[];
  initialSourceName?: string;
}) {
  const { isDark } = useTheme();
  const [feedback, setFeedback] = useState<ParsedFeedbackRow[]>(initialOrgFeedback);
  const [sourceName, setSourceName] = useState<string | null>(initialOrgFeedback.length ? initialSourceName : null);
  const [csvDraft, setCsvDraft] = useState("");
  const [showPastePanel, setShowPastePanel] = useState(initialOrgFeedback.length === 0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<StoredChat[]>(initialChats);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasData = feedback.length > 0;

  async function loadChats() {
    const response = await fetch("/api/chats");
    if (!response.ok) return;
    const payload = (await response.json()) as { chats?: StoredChat[] };
    setChats(payload.chats ?? []);
  }

  const persistRowsInBackground = (rows: ParsedFeedbackRow[], label: string) => {
    setIsSavingData(true);
    void (async () => {
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows, sourceName: label }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Loaded for chat, but could not save to your organization.");
        }
      } catch {
        setError("Loaded for chat, but saving failed. You can still ask questions about this file.");
      } finally {
        setIsSavingData(false);
      }
    })();
  };

  /** Parse locally, unlock the prompt immediately, save to org in the background. */
  const applyCsvText = (text: string, label: string) => {
    const parsed = parseCsv(text, { maxRows: MAX_ASK_CSV_ROWS });
    if (!parsed.length) {
      setError(
        "No feedback rows found. Paste CSV with a content, feedback, or message column — or one feedback item per line.",
      );
      return false;
    }

    setFeedback(parsed);
    setSourceName(label);
    setShowPastePanel(false);
    setCsvDraft("");
    setError(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);

    persistRowsInBackground(parsed, label);
    return true;
  };

  const loadPastedCsv = () => {
    if (!csvDraft.trim()) {
      setError("Paste your CSV data first, then click Load data.");
      return;
    }
    applyCsvText(csvDraft, "Pasted CSV");
  };

  const uploadFeedback = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_ASK_FILE_BYTES) {
      setError("File is too large for Ask LOOP. Use a CSV under 2 MB, or paste up to 300 rows.");
      return;
    }

    setIsReadingFile(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyCsvText(String(reader.result ?? ""), file.name);
      } finally {
        setIsReadingFile(false);
      }
    };
    reader.onerror = () => {
      setError("Could not read that file. Try a .csv, .txt, or .md file.");
      setIsReadingFile(false);
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setFeedback([]);
    setSourceName(null);
    setShowPastePanel(true);
    setCsvDraft("");
    setMessages([]);
    setChatId(null);
    setError(null);
    setInput("");
  };

  const resetChat = () => {
    setMessages([]);
    setChatId(null);
    setError(null);
    setInput("");
  };

  const sendMessage = async (
    question: string,
    contextFeedback = feedback,
    contextSourceName = sourceName ?? "Your feedback",
    previousMessages = messages,
  ) => {
    if (!question || isSending) return;
    if (!contextFeedback.length) {
      setError("No feedback available. Connect Google Play in Settings, paste CSV, or wait for the next sync.");
      setShowPastePanel(true);
      return;
    }

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: question };
    const conversation = [...previousMessages, userMessage];
    const feedbackContext = buildFeedbackContext(contextFeedback);

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
    await sendMessage(input.trim());
  };

  const suggestions = [
    "What is the overall sentiment — positive, negative, or neutral?",
    "What are customers complaining about most?",
    "Show me the biggest themes as a chart",
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0">
      <input ref={fileInputRef} type="file" accept=".csv,.txt,.md,text/csv,text/plain,text/markdown" onChange={uploadFeedback} className="hidden" />

      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 p-3 dark:border-white/10 lg:flex">
        <button onClick={resetChat} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/5">
          <IconPlus size={17} /> New chat
        </button>
        <button
          onClick={() => { setShowPastePanel(true); pasteRef.current?.focus(); }}
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <IconClipboard size={17} /> Paste CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <IconPaperclip size={17} /> Upload file
        </button>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-white/10">
          <p className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">Your data</p>
          {hasData ? (
            <>
              <div className="mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
                <IconFileText size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate">{sourceName}</span>
              </div>
              <p className="px-3 text-xs text-emerald-600 dark:text-emerald-400">{feedback.length} rows loaded</p>
              <button onClick={clearData} className="mt-2 px-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                Replace data
              </button>
            </>
          ) : (
            <p className="mt-2 px-3 text-xs text-slate-400">Paste or upload CSV to start</p>
          )}
        </div>

        {chats.length > 0 && (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-slate-200 pt-4 dark:border-white/10">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">Past chats</p>
            <div className="mt-2 space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => { setChatId(chat.id); setMessages(chat.messages); setError(null); }}
                  className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/5 ${chat.id === chatId ? "bg-slate-100 dark:bg-white/10" : ""}`}
                >
                  {chat.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-end gap-2 border-b border-slate-200 px-4 py-2 dark:border-white/10">
          {chatId && (
            <button onClick={shareChat} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5">
              {shareStatus === "copied" ? <IconCheck size={16} /> : <IconShare3 size={16} />}
              {shareStatus === "copied" ? "Copied" : "Share"}
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()} className="text-sm text-slate-500 lg:hidden">Upload</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-40 pt-8 sm:px-8">
            {showPastePanel && !hasData && (
              <div className="mb-8 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 dark:border-violet-500/20 dark:bg-violet-500/10">
                <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                  <IconClipboard size={18} />
                  Step 1 — Paste your CSV feedback
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Copy your spreadsheet or export as CSV, paste it below, then ask LOOP anything about the data.
                </p>
                <textarea
                  ref={pasteRef}
                  value={csvDraft}
                  onChange={(event) => setCsvDraft(event.target.value)}
                  placeholder={CSV_EXAMPLE}
                  rows={8}
                  className="mt-4 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadPastedCsv}
                    disabled={!csvDraft.trim()}
                    className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-40"
                  >
                    Load data
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    Or upload a file
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Supported columns: <code className="text-violet-500">content</code>, <code className="text-violet-500">feedback</code>, <code className="text-violet-500">message</code> — plus optional <code className="text-violet-500">channel</code> and <code className="text-violet-500">date</code>.
                </p>
              </div>
            )}

            {hasData && showPastePanel && (
              <div className="mb-6 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <p className="text-sm font-medium">Replace your data</p>
                <textarea
                  value={csvDraft}
                  onChange={(event) => setCsvDraft(event.target.value)}
                  placeholder="Paste new CSV here…"
                  rows={5}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-slate-900"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={loadPastedCsv} className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm text-white hover:bg-violet-500">Load</button>
                  <button type="button" onClick={() => { setShowPastePanel(false); setCsvDraft(""); }} className="rounded-lg px-4 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
                  <IconMessageCircle size={24} />
                </div>
                <h2 className="font-display text-2xl font-semibold sm:text-3xl" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                  {hasData ? `Ready to analyze, ${userName.split(" ")[0]}` : `Hi ${userName.split(" ")[0]}, paste your CSV above`}
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {hasData
                    ? `${feedback.length} feedback rows loaded from "${sourceName}". Ask about sentiment, themes, or what to fix first.`
                    : "Upload or paste customer feedback, then ask questions in plain English."}
                </p>
                {hasData && (
                  <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="rounded-xl border border-slate-200 p-3 text-left text-sm text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-7">
                {messages.map((message) => (
                  <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && (
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
                        <IconSparkles size={15} />
                      </div>
                    )}
                    <div className={`max-w-[90%] ${message.role === "user" ? "rounded-2xl bg-slate-100 px-4 py-3 dark:bg-white/10" : "flex-1"}`}>
                      <p className="whitespace-pre-wrap text-[15px] leading-7">{message.content}</p>
                      {message.chart && <PieChart chart={message.chart} />}
                    </div>
                  </article>
                ))}
                {isSending && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600 text-white">
                      <IconSparkles size={15} />
                    </div>
                    <IconLoader2 size={18} className="animate-spin text-slate-400" />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} aria-label="Dismiss error"><IconX size={16} /></button>
              </div>
            )}
          </div>
        </div>

        <div
          className="border-t border-slate-200 px-4 pb-5 pt-4 dark:border-white/10"
          style={{ backgroundImage: `linear-gradient(to top, ${isDark ? "rgb(2 6 23) 72%, transparent" : "rgb(248 250 252) 72%, transparent"})` }}
        >
          <form onSubmit={askLoop} className="mx-auto flex max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-slate-900/80">
            {hasData && (
              <div className="mb-1 flex w-fit max-w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <IconFileText size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate text-emerald-800 dark:text-emerald-200">
                  {sourceName} · {feedback.length} rows
                  {feedback.length >= MAX_ASK_CSV_ROWS ? " (capped)" : ""}
                </span>
                {isSavingData ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                    <IconLoader2 size={12} className="animate-spin" /> Saving
                  </span>
                ) : null}
                <button type="button" onClick={() => setShowPastePanel(true)} className="rounded px-1.5 text-xs text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40">Edit</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isReadingFile}
                aria-label="Upload CSV file"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/10"
              >
                {isReadingFile ? <IconLoader2 size={18} className="animate-spin" /> : <IconPaperclip size={18} />}
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                disabled={isSending}
                rows={1}
                placeholder={
                  isReadingFile
                    ? "Reading file…"
                    : hasData
                      ? "Ask about your CSV data…"
                      : "Load CSV first, then ask your question…"
                }
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-slate-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending || !hasData}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <IconArrowUp size={19} />
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-xs text-slate-400">
            Paste or upload CSV → ask immediately. Up to {MAX_ASK_CSV_ROWS} rows load for chat; org save runs in the background.
          </p>
        </div>
      </section>
    </div>
  );
}
