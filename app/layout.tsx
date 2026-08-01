import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LOOP — AI Customer Feedback & Sentiment Analysis Platform",
  description:
    "LOOP is an AI-powered customer feedback intelligence platform. Automatically classify feedback as positive, negative, or neutral. Discover trends, ask questions in plain English, and close the loop on customer voice.",
  keywords: [
    "customer feedback analysis",
    "sentiment analysis",
    "AI feedback platform",
    "voice of customer",
    "customer sentiment",
    "feedback intelligence",
    "NPS analysis",
    "product feedback tool",
    "customer insights dashboard",
    "positive negative neutral sentiment",
  ],
  openGraph: {
    title: "LOOP — Understand Customer Feedback with AI Sentiment Analysis",
    description:
      "Turn scattered customer feedback into clear positive, negative, and neutral insights. Classify, trend, and act — without reading spreadsheets.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LOOP — AI Customer Feedback & Sentiment Analysis",
    description: "Classify feedback as positive, negative, or neutral. Ask questions. Ship what customers actually want.",
  },
};

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem('loop-theme');
    const theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        jetbrainsMono.variable,
        spaceGrotesk.variable,
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-950 antialiased [font-family:var(--font-geist-sans),system-ui,sans-serif] dark:bg-black dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
