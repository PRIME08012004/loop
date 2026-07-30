"use client";

import { useState, type SVGProps } from "react";
import { motion, type Variants } from "framer-motion";
import { FloatingDock } from "@/components/ui/floating-dock";

type IconName =
  | "tag"
  | "cluster"
  | "chat"
  | "report"
  | "loop"
  | "sun"
  | "moon"
  | "grid"
  | "inbox"
  | "trend"
  | "settings"
  | "search"
  | "plus";

type FeedbackStatus = "new" | "reviewed" | "actioned";
type Sentiment = "Negative" | "Positive" | "Neutral";

interface IconProps {
  name: IconName;
  className?: string;
}

interface SidebarItem {
  label: string;
  icon: IconName;
}

interface FeedbackRow {
  content: string;
  channel: string;
  sentiment: Sentiment;
  status: FeedbackStatus;
}

interface Feature {
  id: string;
  title: string;
  blurb: string;
  points: readonly string[];
  icon: IconName;
}

interface ArchitectureItem {
  label: string;
  detail: string;
}

interface TimelineItem {
  week: string;
  title: string;
  deliverable: string;
}

interface FooterColumn {
  title: string;
  links: readonly string[];
}

interface DecorativeLine {
  top: string;
  left: string;
  w: number;
  rot: number;
}

interface StatusPillProps {
  status: FeedbackStatus;
  isDark: boolean;
}

interface SentimentDotProps {
  sentiment: Sentiment;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { label: "Dashboard", icon: "grid" },
  { label: "Inbox", icon: "inbox" },
  { label: "Trends", icon: "trend" },
  { label: "Ask LOOP", icon: "chat" },
  { label: "Reports", icon: "report" },
  { label: "Settings", icon: "settings" },
] as const;

const FEEDBACK_ROWS: readonly FeedbackRow[] = [
  {
    content: "Onboarding took forever to invite my team",
    channel: "Support",
    sentiment: "Negative",
    status: "new",
  },
  {
    content: "New dashboard is gorgeous and finally fast",
    channel: "App store",
    sentiment: "Positive",
    status: "reviewed",
  },
  {
    content: "Mobile experience needs work overall",
    channel: "NPS",
    sentiment: "Neutral",
    status: "new",
  },
  {
    content: "Wants SSO before renewing — third ask",
    channel: "Sales",
    sentiment: "Negative",
    status: "actioned",
  },
] as const;

const FEATURES: readonly Feature[] = [
  {
    id: "01",
    title: "Auto-classification",
    blurb:
      "Every item is tagged the moment it arrives — sentiment, score, theme, and feature area — no manual triage.",
    points: [
      "Strict JSON output, validated before save",
      "Stored on ingest, never recomputed on render",
      "One-click re-classify for corrections",
    ],
    icon: "tag",
  },
  {
    id: "02",
    title: "Theme clustering & trends",
    blurb:
      "Similar feedback groups itself into named themes, and a trends view flags what's spiking week over week.",
    points: [
      "New items join an existing theme or start one",
      "Drill into any theme's underlying feedback",
      "Spike detection vs. the previous period",
    ],
    icon: "cluster",
  },
  {
    id: "03",
    title: "Ask LOOP",
    blurb:
      "Plain-English questions, answered from real feedback — retrieval first, generation second, nothing invented.",
    points: [
      "Semantic search over embedded feedback",
      "Answers cite the exact items they used",
      "Grounding is mandatory, not optional",
    ],
    icon: "chat",
  },
  {
    id: "04",
    title: "Voice-of-Customer report",
    blurb:
      "One click turns a period of raw feedback into a digest a product lead could forward to leadership as-is.",
    points: [
      "Top themes, sentiment shifts, verbatim quotes",
      "Numbers pre-computed in code, narrated by AI",
      "Saved, revisitable, and exportable",
    ],
    icon: "report",
  },
] as const;

const ARCHITECTURE: readonly ArchitectureItem[] = [
  {
    label: "Client",
    detail: "Next.js App Router · Dashboard, Inbox, Trends, Ask LOOP",
  },
  {
    label: "API layer",
    detail: "Route handlers · auth guard · role guard · Zod validation",
  },
  {
    label: "Services",
    detail: "AI service · ingestion service · embeddings & search",
  },
  {
    label: "Data",
    detail: "PostgreSQL via Prisma · Claude API · embeddings provider",
  },
] as const;

const TIMELINE: readonly TimelineItem[] = [
  {
    week: "Phase 1",
    title: "Foundation & data layer",
    deliverable: "Auth, workspaces, roles, and basic feedback CRUD.",
  },
  {
    week: "Phase 2",
    title: "Core application",
    deliverable: "Bulk import, a filterable inbox, and a dashboard shell.",
  },
  {
    week: "Phase 3",
    title: "AI integration",
    deliverable: "Classification, theme trends, and Ask LOOP on real data.",
  },
  {
    week: "Phase 4",
    title: "Production hardening",
    deliverable: "Voice-of-Customer report, polished UX, full test pass.",
  },
] as const;

const STACK = [
  "Next.js 14",
  "TypeScript",
  "Tailwind CSS",
  "PostgreSQL",
  "Prisma",
  "NextAuth",
  "Claude API",
  "pgvector",
  "Recharts",
  "Zod",
  "Vercel",
] as const;

const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: "Product",
    links: ["Features", "Architecture", "Pricing", "Changelog"],
  },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
  { title: "Resources", links: ["Docs", "API reference", "Status", "Support"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security"] },
] as const;

const HERO_LINES: readonly DecorativeLine[] = [
  { top: "18%", left: "8%", w: 70, rot: -35 },
  { top: "30%", left: "18%", w: 40, rot: -35 },
  { top: "14%", left: "82%", w: 60, rot: -35 },
  { top: "34%", left: "90%", w: 34, rot: -35 },
] as const;

function Icon({ name, className = "w-5 h-5" }: IconProps) {
  const common: SVGProps<SVGSVGElement> = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.6,
  };
  switch (name) {
    case "tag":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 11.5a2 2 0 0 1 0 2.8l-6.7 6.7a2 2 0 0 1-2.8 0L3 11.5Z"
          />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );
    case "cluster":
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="7" r="3" />
          <circle cx="12" cy="17" r="3" />
          <path
            strokeLinecap="round"
            d="M9.2 8.8 10.5 14.8M14.8 8.8 13.5 14.8"
          />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 5h16v10H8l-4 4V5Z"
          />
          <path strokeLinecap="round" d="M8 9.5h8M8 12.5h5" />
        </svg>
      );
    case "report":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 3h9l4 4v14H6V3Z"
          />
          <path strokeLinecap="round" d="M9 12h6M9 15.5h6M9 8.5h3" />
        </svg>
      );
    case "loop":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            d="M4 12a5 5 0 0 1 5-5h6M20 12a5 5 0 0 1-5 5H9"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m12 4 3 3-3 3M12 20l-3-3 3-3"
          />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
          />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12h5l1.5 3h5L16 12h5M3 12l1.5-6.5A2 2 0 0 1 6.4 4h11.2a2 2 0 0 1 1.9 1.5L21 12M3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"
          />
        </svg>
      );
    case "trend":
      return (
        <svg {...common}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 17l5-5 4 4 8-9M20 7h-4M20 7v4"
          />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.6" />
          <path
            strokeLinecap="round"
            d="M12 4v1.6M12 18.4V20M20 12h-1.6M5.6 12H4M17 7l-1.1 1.1M8.1 15.9 7 17M17 17l-1.1-1.1M8.1 8.1 7 7"
          />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path strokeLinecap="round" d="M20 20l-4.5-4.5" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      );
    default:
      return null;
  }
}

function StatusPill({ status, isDark }: StatusPillProps) {
  const map: Record<FeedbackStatus, string> = {
    new: isDark ? "bg-slate-100 text-slate-900" : "bg-slate-900 text-white",
    reviewed: "bg-sky-500/15 text-sky-500 border border-sky-500/30",
    actioned: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  };
  return (
    <span
      className={
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium " +
        map[status]
      }
    >
      {status}
    </span>
  );
}

function SentimentDot({ sentiment }: SentimentDotProps) {
  const color =
    sentiment === "Negative"
      ? "bg-rose-500"
      : sentiment === "Positive"
        ? "bg-emerald-500"
        : "bg-amber-500";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={"h-1.5 w-1.5 rounded-full " + color} />
      {sentiment}
    </span>
  );
}

export default function LoopLanding() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [activeWeek, setActiveWeek] = useState<number>(0);

  const t = isDark
    ? {
        page: "bg-slate-950 text-slate-200",
        navBg: "bg-slate-950/70 border-white/10",
        navText: "text-slate-300",
        heroSub: "text-slate-400",
        headline: "text-white",
        cardBg: "bg-slate-900/60 border-white/10",
        cardBgSolid: "bg-slate-900 border-white/10",
        sidebarText: "text-slate-400",
        sidebarActive: "bg-white/5 text-white",
        tableHeadText: "text-slate-500",
        tableRowBorder: "border-white/5",
        muted: "text-slate-400",
        mutedFaint: "text-slate-500",
        border: "border-white/10",
        chipBg: "bg-white/5 border-white/10 text-slate-300",
        primaryBtn: "bg-white text-slate-950 hover:bg-slate-200",
        secondaryBtn: "border-white/15 text-slate-200 hover:bg-white/5",
        sectionAltBg: "bg-slate-900/30 border-white/5",
        inputBg:
          "bg-slate-900 border-white/10 text-slate-300 placeholder-slate-600",
      }
    : {
        page: "bg-white text-slate-900",
        navBg: "bg-white/70 border-slate-200",
        navText: "text-slate-600",
        heroSub: "text-slate-500",
        headline: "text-slate-900",
        cardBg: "bg-slate-50 border-slate-200",
        cardBgSolid: "bg-white border-slate-200",
        sidebarText: "text-slate-500",
        sidebarActive: "bg-slate-100 text-slate-900",
        tableHeadText: "text-slate-400",
        tableRowBorder: "border-slate-100",
        muted: "text-slate-600",
        mutedFaint: "text-slate-500",
        border: "border-slate-200",
        chipBg: "bg-slate-50 border-slate-200 text-slate-600",
        primaryBtn: "bg-slate-900 text-white hover:bg-slate-700",
        secondaryBtn: "border-slate-300 text-slate-700 hover:bg-slate-50",
        sectionAltBg: "bg-slate-50 border-slate-200",
        inputBg:
          "bg-white border-slate-200 text-slate-600 placeholder-slate-400",
      };

  const dockItems = [
    { title: "Features", icon: <Icon name="tag" />, href: "#features" },
    {
      title: "Architecture",
      icon: <Icon name="cluster" />,
      href: "#architecture",
    },
    { title: "Timeline", icon: <Icon name="trend" />, href: "#timeline" },
    { title: "Stack", icon: <Icon name="grid" />, href: "#stack" },
    { title: "Open dashboard", icon: <Icon name="loop" />, href: "/dashboard" },
    { title: "Sign up", icon: <Icon name="plus" />, href: "#" },
    {
      title: isDark ? "Use light theme" : "Use dark theme",
      icon: <Icon name={isDark ? "sun" : "moon"} />,
      onClick: () => setIsDark((dark) => !dark),
    },
  ];

  return (
    <div
      className={
        "min-h-screen transition-colors duration-300 " +
        t.page +
        (isDark ? " dark" : "")
      }
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .font-mono-loop { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-8">
        <FloatingDock items={dockItems} />
      </div>

      {/* HERO */}
      <section className="relative px-6 pt-24 pb-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {HERO_LINES.map((l, i) => (
            <span
              key={i}
              className={
                "absolute h-px " +
                (isDark ? "bg-amber-500/50" : "bg-amber-400/60")
              }
              style={{
                top: l.top,
                left: l.left,
                width: l.w,
                transform: `rotate(${l.rot}deg)`,
              }}
            />
          ))}
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="relative max-w-3xl mx-auto text-center"
        >
          <motion.span
            variants={fadeUp}
            className={
              "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium font-mono-loop " +
              t.chipBg
            }
          >
            AI-POWERED FEEDBACK INTELLIGENCE
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className={
              "font-display mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.08] " +
              t.headline
            }
          >
            Close the loop on
            <br />
            customer feedback.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className={
              "mt-6 max-w-xl mx-auto text-base md:text-lg " + t.heroSub
            }
          >
            LOOP classifies, clusters, and answers questions about every piece
            of feedback you receive — so you spend your time deciding what to
            build, not reading spreadsheets.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="/dashboard"
              className={
                "rounded-full text-sm font-medium px-6 py-3 transition-colors " +
                t.primaryBtn
              }
            >
              Sign up
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#features"
              className={
                "rounded-full border text-sm font-medium px-6 py-3 transition-colors " +
                t.secondaryBtn
              }
            >
              View live demo
            </motion.a>
          </motion.div>
        </motion.div>

        {/* FLOATING DASHBOARD PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={
            "relative max-w-4xl mx-auto mt-16 rounded-2xl border shadow-2xl overflow-hidden " +
            t.cardBgSolid
          }
        >
          <div className="grid grid-cols-[180px_1fr]">
            <aside className={"border-r p-4 " + t.border}>
              <div className="flex items-center gap-2 mb-6 px-1">
                <span
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-md " +
                    (isDark
                      ? "bg-white/10 text-white"
                      : "bg-slate-900 text-white")
                  }
                >
                  <Icon name="loop" className="w-3.5 h-3.5" />
                </span>
                <span className="font-display font-semibold text-sm">LOOP</span>
              </div>
              <nav className="space-y-1">
                {SIDEBAR_ITEMS.map((s, i) => (
                  <div
                    key={s.label}
                    className={
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm " +
                      (i === 1 ? t.sidebarActive : t.sidebarText)
                    }
                  >
                    <Icon name={s.icon} className="w-4 h-4" />
                    {s.label}
                  </div>
                ))}
              </nav>
            </aside>

            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="font-display text-lg">Feedback inbox</p>
                <div className="flex items-center gap-2">
                  <div
                    className={
                      "hidden sm:flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm " +
                      t.inputBg
                    }
                  >
                    <Icon name="search" className="w-3.5 h-3.5" />
                    <span>Search feedback...</span>
                  </div>
                  <button
                    className={
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium " +
                      t.primaryBtn
                    }
                  >
                    <Icon name="plus" className="w-3.5 h-3.5" />
                    New feedback
                  </button>
                </div>
              </div>

              <p
                className={
                  "text-xs font-mono-loop uppercase tracking-wider mb-3 " +
                  t.mutedFaint
                }
              >
                Recent feedback
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={t.tableHeadText}>
                      <th className="text-left font-medium pb-2">Content</th>
                      <th className="text-left font-medium pb-2">Channel</th>
                      <th className="text-left font-medium pb-2">Sentiment</th>
                      <th className="text-left font-medium pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEEDBACK_ROWS.map((r, i) => (
                      <tr key={i} className={"border-t " + t.tableRowBorder}>
                        <td className="py-2.5 pr-4 max-w-[220px] truncate">
                          {r.content}
                        </td>
                        <td className={"py-2.5 pr-4 " + t.muted}>
                          {r.channel}
                        </td>
                        <td className={"py-2.5 pr-4 " + t.muted}>
                          <SentimentDot sentiment={r.sentiment} />
                        </td>
                        <td className="py-2.5">
                          <StatusPill status={r.status} isDark={isDark} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* PROBLEM / OPPORTUNITY */}
      <section className={"px-6 py-24 border-y " + t.sectionAltBg}>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center"
        >
          <motion.div variants={fadeUp}>
            <p className="text-xs font-mono-loop uppercase tracking-wider text-violet-500 mb-3">
              The problem
            </p>
            <h2
              className={
                "font-display text-3xl md:text-4xl font-semibold leading-tight " +
                t.headline
              }
            >
              The answer to &ldquo;what should we build next&rdquo; is already
              in your inbox.
            </h2>
            <p className={"mt-4 leading-relaxed " + t.muted}>
              It&apos;s scattered across five channels and a hundred
              spreadsheets, one sentence at a time. No team has hours to read,
              tag, and synthesize all of it by hand — so decisions get made on
              gut feel instead.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className={"rounded-xl border p-4 " + t.cardBg}>
                <p className="font-display text-2xl">5+</p>
                <p className={"text-sm " + t.mutedFaint}>
                  channels feeding in every week
                </p>
              </div>
              <div className={"rounded-xl border p-4 " + t.cardBg}>
                <p className="font-display text-2xl">0 hrs</p>
                <p className={"text-sm " + t.mutedFaint}>
                  available to read it all manually
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div
            variants={fadeUp}
            className={"rounded-2xl border p-8 " + t.cardBg}
          >
            <p className="text-xs font-mono-loop uppercase tracking-wider text-violet-500 mb-4">
              With LOOP
            </p>
            <blockquote
              className={
                "font-display text-xl md:text-2xl leading-snug " + t.headline
              }
            >
              &ldquo;43 customers asked for this in the last 30 days, and
              complaints are up 60% week-over-week.&rdquo;
            </blockquote>
            <p className={"mt-4 text-sm " + t.muted}>
              From &ldquo;we think customers want this&rdquo; to a ranked,
              evidence-backed answer — in one dashboard.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-mono-loop uppercase tracking-wider text-violet-500 mb-3"
          >
            AI features
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className={
              "font-display text-3xl md:text-4xl font-semibold " + t.headline
            }
          >
            The intelligence layer
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={"mt-3 max-w-xl mx-auto " + t.muted}
          >
            Four features that require genuine understanding to build — not a
            chatbot bolted on.
          </motion.p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid md:grid-cols-2 gap-6"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.id}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className={"rounded-2xl border p-7 transition-shadow " + t.cardBg}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={
                    "flex h-9 w-9 items-center justify-center rounded-lg border " +
                    (isDark
                      ? "bg-violet-600/15 text-violet-400 border-violet-500/25"
                      : "bg-violet-50 text-violet-600 border-violet-200")
                  }
                >
                  <Icon name={f.icon} />
                </span>
                <span className={"text-xs font-mono-loop " + t.mutedFaint}>
                  {f.id}
                </span>
                <h3 className={"font-display text-lg ml-auto " + t.headline}>
                  {f.title}
                </h3>
              </div>
              <p className={"text-sm leading-relaxed mb-4 " + t.muted}>
                {f.blurb}
              </p>
              <ul className="space-y-2">
                {f.points.map((p, i) => (
                  <li
                    key={i}
                    className={"flex items-start gap-2 text-sm " + t.muted}
                  >
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-violet-500 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ARCHITECTURE */}
      <section
        id="architecture"
        className={"px-6 py-24 border-y " + t.sectionAltBg}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-mono-loop uppercase tracking-wider text-violet-500 mb-3"
            >
              System architecture
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className={
                "font-display text-3xl md:text-4xl font-semibold " + t.headline
              }
            >
              Three tiers. One rule.
            </motion.h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid md:grid-cols-4 gap-4"
          >
            {ARCHITECTURE.map((a, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={"relative rounded-xl border p-5 " + t.cardBgSolid}
              >
                <p className="text-xs font-mono-loop text-violet-500 mb-1">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className={"font-display mb-1 " + t.headline}>{a.label}</p>
                <p className={"text-xs leading-relaxed " + t.mutedFaint}>
                  {a.detail}
                </p>
              </motion.div>
            ))}
          </motion.div>
          <div
            className={
              "mt-8 rounded-xl border p-5 " +
              (isDark
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-amber-300 bg-amber-50")
            }
          >
            <p
              className={
                "text-sm " + (isDark ? "text-amber-200" : "text-amber-800")
              }
            >
              <span className="font-medium">Non-negotiable:</span> every query
              that touches feedback, themes, reports, or users is filtered by
              the caller&apos;s workspace ID — no cross-tenant access, even by
              guessing an ID in the URL.
            </p>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section id="timeline" className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-mono-loop uppercase tracking-wider text-violet-500 mb-3"
          >
            Build plan
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className={
              "font-display text-3xl md:text-4xl font-semibold " + t.headline
            }
          >
            From zero to production
          </motion.h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="grid md:grid-cols-4 gap-4"
        >
          {TIMELINE.map((tl, i) => (
            <motion.button
              key={i}
              variants={fadeUp}
              onClick={() => setActiveWeek(i)}
              className={
                "relative text-left rounded-xl border p-5 transition-colors overflow-hidden " +
                (activeWeek === i
                  ? isDark
                    ? "border-violet-500/50"
                    : "border-violet-400"
                  : t.cardBg)
              }
            >
              {activeWeek === i && (
                <motion.div
                  layoutId="activePhase"
                  className={
                    "absolute inset-0 -z-10 " +
                    (isDark ? "bg-violet-500/10" : "bg-violet-50")
                  }
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <p className="text-xs font-mono-loop text-violet-500 mb-2">
                {tl.week}
              </p>
              <p className={"font-display mb-2 " + t.headline}>{tl.title}</p>
              <p className={"text-xs leading-relaxed " + t.mutedFaint}>
                {tl.deliverable}
              </p>
            </motion.button>
          ))}
        </motion.div>
      </section>

      {/* STACK */}
      <section id="stack" className={"px-6 py-16 border-y " + t.sectionAltBg}>
        <div className="max-w-5xl mx-auto text-center">
          <p
            className={
              "text-xs font-mono-loop uppercase tracking-wider mb-6 " +
              t.mutedFaint
            }
          >
            Built with
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((s) => (
              <span
                key={s}
                className={
                  "rounded-full border px-4 py-2 text-sm font-mono-loop " +
                  t.chipBg
                }
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className={
              "font-display text-3xl md:text-4xl font-semibold " + t.headline
            }
          >
            Stop guessing what customers want.
          </motion.h2>
          <motion.p variants={fadeUp} className={"mt-4 " + t.muted}>
            Get started with LOOP in minutes — no credit card required.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#"
              className={
                "rounded-full text-sm font-medium px-6 py-3 transition-colors " +
                t.primaryBtn
              }
            >
              Sign up
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href="#"
              className={
                "rounded-full border text-sm font-medium px-6 py-3 transition-colors " +
                t.secondaryBtn
              }
            >
              Talk to sales
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className={"border-t px-6 py-14 " + t.border}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={
                    "flex h-6 w-6 items-center justify-center rounded-md " +
                    (isDark
                      ? "bg-white/10 text-white"
                      : "bg-slate-900 text-white")
                  }
                >
                  <Icon name="loop" className="w-3.5 h-3.5" />
                </span>
                <span className="font-display font-semibold text-sm">LOOP</span>
              </div>
              <p className={"text-sm max-w-xs " + t.mutedFaint}>
                AI customer-feedback intelligence for teams who&apos;d rather
                ship the right thing than guess.
              </p>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p
                  className={
                    "text-xs font-mono-loop uppercase tracking-wider mb-3 " +
                    t.mutedFaint
                  }
                >
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className={
                          "text-sm " +
                          t.muted +
                          (isDark
                            ? " hover:text-white"
                            : " hover:text-slate-900")
                        }
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            className={
              "mt-10 pt-6 border-t text-xs " + t.border + " " + t.mutedFaint
            }
          >
            © 2026 LOOP. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
