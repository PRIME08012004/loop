"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Integration = {
  provider: string;
  packageName: string | null;
  status: string;
  lastPolledAt: string | null;
  lastPollError: string | null;
  hasTokens: boolean;
};

function oauthMessageFromParams(searchParams: URLSearchParams) {
  if (searchParams.get("connected") === "google_play") {
    return "Google Play connected. Enter your package name below.";
  }
  const error = searchParams.get("error");
  if (error) return `Connection failed: ${error}`;
  return null;
}

export default function IntegrationsSettings({ initialIntegration }: { initialIntegration: Integration | null }) {
  const searchParams = useSearchParams();
  const [integration, setIntegration] = useState(initialIntegration);
  const [packageName, setPackageName] = useState(initialIntegration?.packageName ?? "");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const message = actionMessage ?? oauthMessageFromParams(searchParams);

  const savePackage = async () => {
    setSaving(true);
    setActionMessage(null);
    const response = await fetch("/api/integrations/google-play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageName }),
    });
    const payload = (await response.json()) as { error?: string; packageName?: string };
    setSaving(false);
    if (!response.ok) {
      setActionMessage(payload.error ?? "Could not save package name.");
      return;
    }
    setIntegration((prev) => ({
      provider: "GOOGLE_PLAY",
      packageName: payload.packageName ?? packageName,
      status: "ACTIVE",
      lastPolledAt: prev?.lastPolledAt ?? null,
      lastPollError: null,
      hasTokens: true,
    }));
    setActionMessage("Package name saved. Reviews will sync every 15 minutes.");
  };

  const disconnect = async () => {
    await fetch("/api/integrations/google-play", { method: "DELETE" });
    setIntegration(null);
    setPackageName("");
    setActionMessage("Google Play disconnected.");
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/settings" className="text-sm text-violet-600 hover:underline">← Back to settings</Link>
        <h2 className="mt-2 font-display text-xl font-semibold" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Integrations</h2>
        <p className="mt-1 text-sm text-slate-500">Connect app stores to automatically import reviews into your organization.</p>
      </div>

      {message && (
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
          {message}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">Google Play</h3>
            <p className="mt-1 text-sm text-slate-500">Poll app reviews every 15 minutes via the Play Developer API.</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              integration?.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-500/15 text-slate-500"
            }`}
          >
            {integration?.status ?? "Not connected"}
          </span>
        </div>

        {!integration || integration.status === "DISCONNECTED" || !integration.hasTokens ? (
          <a href="/api/integrations/google-play/connect" className="mt-4 inline-block rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500">
            Connect Google Play
          </a>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Package name</label>
              <input
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="com.example.app"
                className="mt-1 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void savePackage()} disabled={saving} className="rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
                {saving ? "Saving…" : "Save package"}
              </button>
              <button type="button" onClick={() => void disconnect()} className="rounded-full border border-slate-200 px-5 py-2 text-sm dark:border-white/10">
                Disconnect
              </button>
            </div>
            {integration.lastPolledAt && <p className="text-xs text-slate-400">Last polled: {new Date(integration.lastPolledAt).toLocaleString()}</p>}
            {integration.lastPollError && <p className="text-xs text-rose-500">Last error: {integration.lastPollError}</p>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 p-6 dark:border-white/10">
        <h3 className="font-medium text-slate-500">App Store Connect</h3>
        <p className="mt-1 text-sm text-slate-400">Coming soon — connect with API keys to import iOS app reviews.</p>
      </div>
    </div>
  );
}
