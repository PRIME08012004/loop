"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LoopIcon } from "@/components/loop-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  canAccessFeature,
  type PlanFeature,
  type PlanId,
} from "@/lib/plans";
import {
  canExportReports,
  canManageWorkspace,
  ROLE_LABELS,
  type AppRole,
} from "@/lib/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: Parameters<typeof LoopIcon>[0]["name"];
  feature: PlanFeature;
  requires?: (role: AppRole) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "grid", feature: "dashboard" },
  { label: "Inbox", href: "/dashboard/inbox", icon: "inbox", feature: "inbox" },
  { label: "Trends", href: "/dashboard/trends", icon: "trend", feature: "trends" },
  { label: "Ask LOOP", href: "/dashboard/ask", icon: "chat", feature: "ask" },
  { label: "Reports", href: "/dashboard/reports", icon: "report", feature: "reports", requires: canExportReports },
  { label: "Settings", href: "/dashboard/settings", icon: "settings", feature: "settings", requires: canManageWorkspace },
];

function pageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/settings/integrations")) return "Integrations";
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );
  return match?.label ?? "Dashboard";
}

export default function AppShell({
  children,
  userName,
  userRole,
  plan,
  planExpiresAt,
  hasActivePlan,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: AppRole;
  plan: PlanId;
  planExpiresAt: string | null;
  hasActivePlan: boolean;
}) {
  const pathname = usePathname();
  const title = pageTitle(pathname);
  const visibleNav = NAV_ITEMS.filter((item) => !item.requires || item.requires(userRole));

  const handleSignOut = () => {
    void signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 transition-colors duration-300 dark:bg-black dark:text-white">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex">
          <div className="mb-6 flex items-center justify-between gap-2 px-1">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                <LoopIcon name="loop" className="h-4 w-4" />
              </span>
              <span
                className="text-sm font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display), system-ui" }}
              >
                LOOP
              </span>
            </Link>
            <ThemeToggle />
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {visibleNav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const unlocked = canAccessFeature(plan, planExpiresAt, item.feature);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={unlocked ? item.label : `${item.label} — upgrade to unlock`}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : unlocked
                        ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                        : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                  }`}
                >
                  <LoopIcon name={item.icon} className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {!unlocked ? <LoopIcon name="lock" className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 shrink-0 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {!hasActivePlan ? (
              <Link
                href="/dashboard/settings#billing"
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-700"
              >
                <LoopIcon name="lock" className="h-3.5 w-3.5" />
                Unlock full LOOP
              </Link>
            ) : (
              <div className="rounded-lg px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-zinc-400">
                {plan} plan
              </div>
            )}
            <div className="rounded-lg px-2.5 py-2 text-xs text-zinc-400 dark:text-zinc-500">
              <p className="truncate font-medium text-zinc-700 dark:text-zinc-300">{userName}</p>
              <p>{ROLE_LABELS[userRole]}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
            >
              <LoopIcon name="logout" className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-black/90 md:px-6">
            <div className="flex items-center gap-2">
              <h1
                className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display), system-ui" }}
              >
                {title}
              </h1>
              {!hasActivePlan && title !== "Dashboard" && title !== "Settings" ? (
                <LoopIcon name="lock" className="h-4 w-4 text-zinc-400" />
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <div className="md:hidden">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white md:hidden"
                aria-label="Log out"
              >
                <LoopIcon name="logout" className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </header>
          <main
            className={`flex-1 overflow-y-auto ${
              pathname.startsWith("/dashboard/ask") ? "p-0" : "p-4 md:p-6"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
