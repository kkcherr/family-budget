"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender-200 text-2xl">
            🪷
          </div>
          <h1 className="text-2xl font-semibold text-ink">Family Budget</h1>
          <p className="mt-1 text-sm text-ink-soft">
            A calm weekly check-in, just for the two of you.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card p-6">
          <label htmlFor="password" className="label">
            Shared password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your household password"
            className="input"
          />

          {error && (
            <p className="mt-3 rounded-xl bg-terracotta-100 px-3 py-2 text-sm text-terracotta-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary mt-5 w-full"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-faint">
          You both share one login and see the same numbers.
        </p>
      </div>
    </main>
  );
}
