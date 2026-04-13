import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/features/auth/server/session";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/play");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_45%,#ffffff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 px-4 py-12">
        <div className="max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 ring-1 ring-slate-200 backdrop-blur">
            Bet Wars
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Separate the player experience from the operations console.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            The app now has a dedicated player flow for betting and a separate admin surface for reset and settlement tools. This keeps the product direction cleaner while we prepare auth and role-based access.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/register"
            className="group rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-sky-100/60 ring-1 ring-white/80 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Register</div>
            <div className="mt-4 text-2xl font-semibold text-slate-950">Create a player account</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Start with a fresh account, get a bankroll, and head straight into the player area after sign-up.
            </p>
            <div className="mt-6 text-sm font-medium text-sky-700 group-hover:text-sky-900">Go to /register</div>
          </Link>

          <Link
            href="/login"
            className="group rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-slate-50 shadow-xl shadow-slate-300/40 transition hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">Login</div>
            <div className="mt-4 text-2xl font-semibold">Sign in to your account</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Use an existing player or admin account and we’ll send you to the right area automatically.
            </p>
            <div className="mt-6 text-sm font-medium text-amber-300 group-hover:text-amber-200">Go to /login</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
