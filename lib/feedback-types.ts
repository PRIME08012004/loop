export type FeedbackStatus = "new" | "reviewed" | "actioned";
export type Sentiment = "Positive" | "Negative" | "Neutral";

export interface FeedbackRow {
  id: string;
  content: string;
  channel: string;
  sentiment: Sentiment;
  status: FeedbackStatus;
  createdAt: string;
}

export const SAMPLE_FEEDBACK: FeedbackRow[] = [
  {
    id: "1",
    content: "Onboarding took forever to invite my team",
    channel: "Support",
    sentiment: "Negative",
    status: "new",
    createdAt: "2026-07-30",
  },
  {
    id: "2",
    content: "New dashboard is gorgeous and finally fast",
    channel: "App store",
    sentiment: "Positive",
    status: "reviewed",
    createdAt: "2026-07-29",
  },
  {
    id: "3",
    content: "Mobile experience needs work overall",
    channel: "NPS",
    sentiment: "Neutral",
    status: "new",
    createdAt: "2026-07-29",
  },
  {
    id: "4",
    content: "Wants SSO before renewing — third ask",
    channel: "Sales",
    sentiment: "Negative",
    status: "actioned",
    createdAt: "2026-07-28",
  },
  {
    id: "5",
    content: "Support was fast and helpful resolving my ticket",
    channel: "Support",
    sentiment: "Positive",
    status: "reviewed",
    createdAt: "2026-07-27",
  },
  {
    id: "6",
    content: "Billing keeps timing out when I download an invoice",
    channel: "Support",
    sentiment: "Negative",
    status: "new",
    createdAt: "2026-07-26",
  },
  {
    id: "7",
    content: "Love the export feature. It saved me an hour today.",
    channel: "Community",
    sentiment: "Positive",
    status: "actioned",
    createdAt: "2026-07-25",
  },
  {
    id: "8",
    content: "Setup was smooth this time. Very easy to get started.",
    channel: "NPS",
    sentiment: "Positive",
    status: "reviewed",
    createdAt: "2026-07-24",
  },
];

export function sentimentStats(rows: FeedbackRow[]) {
  const total = rows.length;
  const positive = rows.filter((r) => r.sentiment === "Positive").length;
  const negative = rows.filter((r) => r.sentiment === "Negative").length;
  const neutral = rows.filter((r) => r.sentiment === "Neutral").length;
  return {
    total,
    positive,
    negative,
    neutral,
    positivePct: total ? Math.round((positive / total) * 100) : 0,
    negativePct: total ? Math.round((negative / total) * 100) : 0,
    neutralPct: total ? Math.round((neutral / total) * 100) : 0,
  };
}
