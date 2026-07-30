"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function emailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    if (isRegistering) {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "We could not create your account.");
        setSending(false);
        return;
      }
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) setMessage("Incorrect email or password.");
    else router.push(callbackUrl);
    setSending(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
      <section className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <p className="text-sm font-medium tracking-widest text-neutral-400">LOOP</p>
        <h1 className="mt-4 text-2xl font-semibold">{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-neutral-400">{isRegistering ? "Use your email and password to start private conversations." : "Sign in to access your private feedback conversations."}</p>
        <div className="mt-6 space-y-3">
          <button onClick={() => signIn("google", { callbackUrl })} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200">Continue with Google</button>
          <button onClick={() => signIn("github", { callbackUrl })} className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium transition hover:bg-neutral-800">Continue with GitHub</button>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-neutral-500"><span className="h-px flex-1 bg-neutral-800" />OR<span className="h-px flex-1 bg-neutral-800" /></div>
        <form onSubmit={emailSignIn} className="space-y-3">
          {isRegistering && <><label className="block text-sm" htmlFor="name">Name</label><input id="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm outline-none focus:border-neutral-400" /></>}
          <label className="block text-sm" htmlFor="email">Email address</label>
          <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm outline-none focus:border-neutral-400" />
          <label className="block text-sm" htmlFor="password">Password</label>
          <input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm outline-none focus:border-neutral-400" />
          <button disabled={sending} type="submit" className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-950 transition hover:bg-white disabled:opacity-50">{sending ? "Please wait…" : isRegistering ? "Create account" : "Sign in with email"}</button>
        </form>
        {message && <p className="mt-4 text-sm text-neutral-400">{message}</p>}
        <button onClick={() => { setIsRegistering((value) => !value); setMessage(null); }} className="mt-5 w-full text-sm text-neutral-400 underline underline-offset-4 hover:text-white">{isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}</button>
      </section>
    </main>
  );
}
