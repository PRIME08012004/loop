"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function emailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    const result = await signIn("nodemailer", { email, callbackUrl, redirect: false });
    setMessage(result?.error ? "We could not send the sign-in link. Check the email provider settings." : "Check your inbox for a secure sign-in link.");
    setSending(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <section className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <p className="text-sm font-medium tracking-widest text-neutral-400">LOOP</p>
        <h1 className="mt-4 text-2xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-neutral-400">Sign in to access your private feedback conversations.</p>
        <div className="mt-6 space-y-3">
          <button onClick={() => signIn("google", { callbackUrl })} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200">Continue with Google</button>
          <button onClick={() => signIn("github", { callbackUrl })} className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium transition hover:bg-neutral-800">Continue with GitHub</button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-neutral-500"><span className="h-px flex-1 bg-neutral-800" />OR<span className="h-px flex-1 bg-neutral-800" /></div>
        <form onSubmit={emailSignIn} className="space-y-3">
          <label className="block text-sm" htmlFor="email">Email address</label>
          <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm outline-none focus:border-neutral-400" />
          <button disabled={sending} type="submit" className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white disabled:opacity-50">{sending ? "Sending…" : "Email me a sign-in link"}</button>
        </form>
        {message && <p className="mt-4 text-sm text-neutral-400">{message}</p>}
      </section>
    </main>
  );
}
