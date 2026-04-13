import Link from "next/link";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";

export function AccountMenu({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  const roleLabel = role === "admin" ? "Admin" : "Player";
  const initial = email.charAt(0).toUpperCase();

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
          {initial}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[12rem] truncate font-medium text-slate-900">{email}</span>
          <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">{roleLabel}</span>
        </span>
        <span className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/60">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">{email}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{roleLabel} account</div>
        </div>

        <div className="mt-3 grid gap-2 text-sm">
          <Link href="/play" className="rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-50">
            Play dashboard
          </Link>
          <Link href="/bankroll" className="rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-50">
            Bankroll
          </Link>
          <Link href="/tickets" className="rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-50">
            Tickets
          </Link>
          {role === "admin" && (
            <Link href="/admin/tools" className="rounded-2xl px-4 py-3 text-slate-700 transition hover:bg-slate-50">
              Admin tools
            </Link>
          )}
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          <LogoutButton className="w-full justify-center" />
        </div>
      </div>
    </details>
  );
}
