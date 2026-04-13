"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastBar } from "@/app/_components/ToastBar";
import { fetchBankroll, fetchTickets, fetchTodayMatches, postReset, postSettleMock } from "@/lib/api";
import { fmtCents, utcTodayISODate } from "@/lib/betting";

export function AdminToolsPanel() {
  const [bankrollCents, setBankrollCents] = useState<number>(0);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [slateDate, setSlateDate] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const utcTodayISO = useMemo(() => utcTodayISODate(), []);

  function showToast(message: string) {
    setToast(message);

    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2500);
  }

  const refresh = useCallback(async () => {
    try {
      const [b, m, t] = await Promise.all([fetchBankroll(), fetchTodayMatches(), fetchTickets()]);
      if (!isMountedRef.current) return;

      startTransition(() => {
        setBankrollCents(b.amountCents ?? 0);
        setMatchCount(m.matches?.length ?? 0);
        setTicketCount(t.tickets?.length ?? 0);
        setSlateDate(m.slateDate ?? utcTodayISO);
      });
    } catch {
      if (!isMountedRef.current) return;
      showToast("Could not refresh admin data right now.");
    }
  }, [utcTodayISO]);

  useEffect(() => {
    isMountedRef.current = true;
    const refreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(refreshTimer);
      isMountedRef.current = false;
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, [refresh]);

  async function onReset() {
    showToast("Resetting & reseeding...");

    try {
      const j = await postReset();
      showToast(j.ok ? `Reset ✅ Seeded ${j.matches} matches.` : j.error ?? "Reset failed");
      await refresh();
    } catch {
      showToast("Could not reset the slate right now.");
    }
  }

  async function onSettleMock() {
    showToast("Settling one match...");

    try {
      const j = await postSettleMock();

      if (!j.ok) showToast(j.error ?? "Settle failed");
      else if (j.match) {
        showToast(`FT: ${j.match.homeTeam} ${j.match.scoreHome}-${j.match.scoreAway} ${j.match.awayTeam}`);
      } else {
        showToast(j.message ?? "Done");
      }

      await refresh();
    } catch {
      showToast("Could not settle a match right now.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200 ring-1 ring-amber-300/20">
                Admin Surface
              </span>
              <Link
                href="/play"
                className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
              >
                Back to play
              </Link>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operations Console</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Keep admin workflows separate from the player flow. This page holds the mock controls until we add authentication and richer back-office screens.
            </p>
          </div>

          <button
            onClick={refresh}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
          >
            Refresh snapshot
          </button>
        </div>
        <ToastBar message={toast} />
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Slate date</div>
              <div className="mt-3 text-2xl font-semibold text-white">{slateDate || utcTodayISO}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Matches</div>
              <div className="mt-3 text-2xl font-semibold text-white">{matchCount}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Tickets</div>
              <div className="mt-3 text-2xl font-semibold text-white">{ticketCount}</div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Mock controls</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Reset the full slate or settle one scheduled match. These are intentionally isolated here so the player-facing UI stays focused on betting.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Bankroll snapshot: <span className="font-semibold">{fmtCents(bankrollCents)}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                onClick={onSettleMock}
                className="rounded-3xl border border-white/10 bg-white px-5 py-5 text-left text-slate-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <div className="text-sm font-semibold">Settle one match</div>
                <div className="mt-2 text-sm text-slate-600">
                  Pick a random scheduled fixture, mark it finished, and settle any open legs that depend on it.
                </div>
              </button>

              <button
                onClick={onReset}
                className="rounded-3xl border border-rose-400/25 bg-rose-500 px-5 py-5 text-left text-white shadow-lg shadow-rose-950/30 transition hover:-translate-y-0.5 hover:bg-rose-400"
              >
                <div className="text-sm font-semibold">Reset mock slate</div>
                <div className="mt-2 text-sm text-rose-50/90">
                  Clear tickets, rebuild fixtures, and restore the demo bankroll. This is destructive and should become admin-only once auth lands.
                </div>
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
            <h2 className="text-lg font-semibold text-white">Next step</h2>
            <p className="mt-2 text-sm text-slate-400">
              The app now has separate user and admin pages. The next milestone is to add auth and role checks so only admins can open this screen and call the admin APIs.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30">
            <h2 className="text-lg font-semibold text-white">Suggested roadmap</h2>
            <ul className="mt-3 space-y-3 text-sm text-slate-300">
              <li>1. Add `/login`, sessions, and `requireAdmin()` guards.</li>
              <li>2. Move admin route logic into a dedicated server service layer.</li>
              <li>3. Add focused admin pages for matches, tickets, and bankroll.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
