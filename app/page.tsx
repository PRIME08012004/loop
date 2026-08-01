"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import {
  ArrowRightIcon,
  ChatCircleIcon,
  ChartLineUpIcon,
  GithubLogoIcon,
  QuotesIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SAMPLE_FEEDBACK } from "@/lib/feedback-types";

const GITHUB_REPO = "https://github.com/PRIME08012004/loop";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease } },
};

const FEATURES = [
  {
    title: "Sentiment, instantly",
    body: "Every review lands already labeled positive, negative, or neutral — the moment it arrives.",
    detail: "No spreadsheets. No manual tagging.",
    icon: TagIcon,
  },
  {
    title: "Ask in plain English",
    body: "Query your feedback like a teammate. Answers cite the real rows behind every claim.",
    detail: "Grounded responses, not guesses.",
    icon: ChatCircleIcon,
  },
  {
    title: "Trends before crises",
    body: "See what is spiking week over week across Google Play and the rest of your inbox.",
    detail: "Catch pain early. Ship with context.",
    icon: ChartLineUpIcon,
  },
] as const;

const BRIEF_POINTS = [
  {
    title: "Ingest",
    body: "Connect Google Play, paste a CSV, or upload support notes — LOOP brings every channel into one place.",
  },
  {
    title: "Understand",
    body: "AI classifies each item as positive, negative, or neutral and clusters themes so you see the signal, not the noise.",
  },
  {
    title: "Act",
    body: "Ask LOOP what to fix next, share sentiment with your team, and ship from evidence instead of gut feel.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "We stopped debating what customers want. LOOP showed us onboarding complaints were up 40% — and which exact reviews proved it.",
    name: "Maya Chen",
    role: "Head of Product",
    company: "Northline",
    initials: "MC",
  },
  {
    quote:
      "Ask LOOP replaced three hours of spreadsheet reading every Monday. I get a clear sentiment picture before standup.",
    name: "Jordan Hale",
    role: "Customer Success Lead",
    company: "Parcel",
    initials: "JH",
  },
  {
    quote:
      "Connecting Google Play was the unlock. Reviews land in our inbox already tagged. Analysts and owners finally share the same view.",
    name: "Priya Nair",
    role: "Founder",
    company: "Kite Labs",
    initials: "PN",
  },
] as const;

const FOOTER = {
  product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Features", href: "#features" },
    { label: "Integrations", href: "#brief" },
    { label: "Sign in", href: "/login" },
  ],
  resources: [
    { label: "Documentation", href: "https://github.com/PRIME08012004/loop/tree/main/doc" },
    { label: "Permissions", href: "https://github.com/PRIME08012004/loop/blob/main/doc/permissions.md" },
    { label: "Integrations guide", href: "https://github.com/PRIME08012004/loop/blob/main/doc/integrations.md" },
    { label: "Open source", href: GITHUB_REPO },
  ],
  company: [
    { label: "GitHub", href: GITHUB_REPO },
    { label: "Contribute", href: `${GITHUB_REPO}/blob/main/README.md` },
    { label: "Issues", href: `${GITHUB_REPO}/issues` },
  ],
} as const;

function SentimentMark({ sentiment }: { sentiment: string }) {
  const color =
    sentiment === "Negative"
      ? "bg-rose-500"
      : sentiment === "Positive"
        ? "bg-emerald-500"
        : "bg-amber-500";
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-zinc-500 dark:text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {sentiment}
    </span>
  );
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.25)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <span className="ml-3 font-mono text-[11px] tracking-wide text-zinc-400">loop.app/dashboard</span>
      </div>
      <div className="grid grid-cols-[148px_1fr]">
        <aside className="hidden border-r border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-black sm:block">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-950 text-[10px] font-semibold text-white dark:bg-white dark:text-zinc-950">
              L
            </span>
            <span className="text-sm font-semibold tracking-tight">LOOP</span>
          </div>
          <nav className="space-y-1 text-[13px]">
            {["Dashboard", "Inbox", "Trends", "Ask LOOP"].map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-2.5 py-1.5 ${
                  i === 0
                    ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Sentiment overview</p>
              <p className="mt-0.5 text-xs text-zinc-400">Last 7 days · Google Play + inbox</p>
            </div>
            <div className="flex gap-4 text-right">
              {[
                { label: "Pos", value: "48%", tone: "text-emerald-600 dark:text-emerald-400" },
                { label: "Neg", value: "31%", tone: "text-rose-600 dark:text-rose-400" },
                { label: "Neu", value: "21%", tone: "text-amber-600 dark:text-amber-400" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">{stat.label}</p>
                  <p className={`text-sm font-semibold ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            {SAMPLE_FEEDBACK.slice(0, 4).map((row, index) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.35 + index * 0.08, ease }}
                className="flex items-center justify-between gap-4 border-t border-zinc-100 py-3 text-[13px] dark:border-zinc-800"
              >
                <p className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">{row.content}</p>
                <SentimentMark sentiment={row.sentiment} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoopLanding() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 transition-colors duration-300 antialiased dark:bg-black dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 dark:hidden"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.95), transparent 60%), radial-gradient(800px 400px at 80% 20%, rgba(228,228,222,0.45), transparent 50%)",
        }}
      />

      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-6"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
            L
          </span>
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display), system-ui" }}
          >
            LOOP
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-zinc-500 dark:text-zinc-400 md:flex">
          <a href="#brief" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
            Product
          </a>
          <a href="#features" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
            Features
          </a>
          <a href="#stories" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
            Stories
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-950 dark:hover:text-white"
          >
            <GithubLogoIcon weight="bold" className="h-4 w-4" />
            GitHub
          </a>
          <Link href="/login" className="transition-colors hover:text-zinc-950 dark:hover:text-white">
            Sign in
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:text-white md:hidden"
          >
            <GithubLogoIcon weight="bold" className="h-4 w-4" />
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Get started
            <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </motion.header>

      <section className="mx-auto max-w-5xl px-6 pb-10 pt-16 text-center sm:pt-24">
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center">
          <motion.a
            variants={fadeUp}
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            whileHover={{ y: -1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:text-white"
          >
            <GithubLogoIcon weight="bold" className="h-3.5 w-3.5" />
            Open source · contribute on GitHub
          </motion.a>
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-semibold tracking-tight sm:text-7xl"
            style={{ fontFamily: "var(--font-display), system-ui" }}
          >
            LOOP
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-xl"
          >
            The AI that reads your customer feedback — and tells you what to build next.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Start free
                <ArrowRightIcon weight="bold" className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/60 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              <GithubLogoIcon weight="bold" className="h-4 w-4" />
              View on GitHub
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

      <section id="product" className="mx-auto max-w-5xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.2, ease }}
          whileHover={{ y: -4 }}
        >
          <ProductPreview />
        </motion.div>
      </section>

      <section id="brief" className="border-t border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={stagger}
            className="max-w-2xl"
          >
            <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              What is LOOP
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-display), system-ui" }}
            >
              Feedback intelligence for product teams.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg"
            >
              LOOP turns scattered customer voice — app store reviews, surveys, tickets, CSV dumps —
              into a shared dashboard your owners and analysts can trust. Sentiment is classified on
              ingest. Themes surface automatically. You ask questions in plain English and get answers
              grounded in real feedback.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
            className="mt-14 grid gap-4 sm:grid-cols-3"
          >
            {BRIEF_POINTS.map((point, index) => (
              <motion.div
                key={point.title}
                variants={cardReveal}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="font-mono text-xs tracking-wider text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3
                  className="mt-4 text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display), system-ui" }}
                >
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{point.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={stagger}
            className="mb-12 max-w-xl"
          >
            <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              Features
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display), system-ui" }}
            >
              Everything you need to close the loop.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid gap-4 md:grid-cols-3"
          >
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={cardReveal}
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 320, damping: 22 } }}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <motion.span
                  whileHover={{ rotate: -6, scale: 1.08 }}
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <feature.icon weight="duotone" className="h-5 w-5" />
                </motion.span>
                <h3
                  className="relative mt-6 text-lg font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display), system-ui" }}
                >
                  {feature.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {feature.body}
                </p>
                <p className="relative mt-4 text-xs font-medium text-zinc-400 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                  {feature.detail}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="stories" className="border-t border-zinc-200 bg-white/50 dark:border-zinc-800 dark:bg-zinc-950/30">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="mb-12 max-w-xl"
          >
            <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              From teams
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-3xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display), system-ui" }}
            >
              Built for people who ship from customer voice.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid gap-4 md:grid-cols-3"
          >
            {TESTIMONIALS.map((item) => (
              <motion.blockquote
                key={item.name}
                variants={cardReveal}
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <QuotesIcon
                  weight="fill"
                  className="absolute right-5 top-5 h-8 w-8 text-zinc-100 dark:text-zinc-800"
                />
                <p className="relative text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <footer className="relative mt-auto flex items-center gap-3 pt-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
                    {item.initials}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-400">
                      {item.role}, {item.company}
                    </p>
                  </div>
                </footer>
              </motion.blockquote>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-28 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display), system-ui" }}
          >
            Stop guessing what customers want.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-zinc-500 dark:text-zinc-400">
            Connect Google Play. Paste a CSV. Ask LOOP.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Get started
                <ArrowRightIcon weight="bold" className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              <GithubLogoIcon weight="bold" className="h-4 w-4" />
              Contribute
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t border-zinc-200 bg-white/70 px-6 py-14 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-950 text-[10px] font-semibold text-white dark:bg-white dark:text-zinc-950">
                  L
                </span>
                <span
                  className="text-sm font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display), system-ui" }}
                >
                  LOOP
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                AI customer-feedback intelligence — sentiment analysis, store review sync, and Ask
                LOOP for product teams.
              </p>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                <GithubLogoIcon weight="bold" className="h-4 w-4" />
                github.com/PRIME08012004/loop
              </a>
            </div>

            {(
              [
                { title: "Product", links: FOOTER.product },
                { title: "Resources", links: FOOTER.resources },
                { title: "Community", links: FOOTER.company },
              ] as const
            ).map((column) => (
              <div key={column.title}>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("http") ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-zinc-200 pt-6 text-xs text-zinc-400 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} LOOP. Open source for contributors.</span>
            <span>Positive · Negative · Neutral — classified on ingest.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
