"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Login failed");
      }
      router.push("/operations");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Door in Four
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">FC control room login</h1>
        <p className="mt-3 text-sm text-slate-300">
          Enter the admin dashboard password to unlock browser API access (sets a secure session
          cookie). API clients should use <code className="text-emerald-200">x-api-key</code>{" "}
          instead.
        </p>

        <label className="mt-8 block text-sm font-semibold text-slate-200">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-white"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
