"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Mode = "login" | "register";

type AuthFormProps = {
  mode: Mode;
  nextPath?: string;
};

type AuthResponse = {
  ok: boolean;
  error?: string;
  user?: {
    id: number;
    email: string;
    role: string;
  };
};

function normalizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith("/")) return undefined;
  return nextPath;
}

export function AuthForm({ mode, nextPath }: AuthFormProps) {
  const router = useRouter();
  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState(false);

  const title = mode === "login" ? "Log in to continue" : "Create your account";
  const subtitle =
    mode === "login"
      ? "Access the player flow or admin surface with your account."
      : "Register a new account and start in the player area.";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = (await res.json()) as AuthResponse;
      if (!res.ok || !body.ok || !body.user) {
        setError(body.error ?? "Authentication failed.");
        return;
      }

      const fallbackPath = body.user.role === "admin" ? "/admin" : "/play";
      router.push(safeNextPath ?? fallbackPath);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_45%,#ffffff_100%)] px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm font-medium text-sky-700 hover:text-sky-900">
          Back to home
        </Link>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-sky-100/60 backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{subtitle}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-sky-400"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 transition focus:border-sky-400"
                placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                required
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Working..." : mode === "login" ? "Log in" : "Register"}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-600">
            {mode === "login" ? (
              <>
                Need an account?{" "}
                <Link href="/register" className="font-medium text-sky-700 hover:text-sky-900">
                  Register
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-sky-700 hover:text-sky-900">
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
