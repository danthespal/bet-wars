"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MatchCard } from "@/app/_components/MatchCard";
import { Slip } from "@/app/_components/Slip";
import { TicketsList } from "@/app/_components/TicketsList";
import { ToastBar } from "@/app/_components/ToastBar";
import { fetchBankroll, fetchTickets, fetchTodayMatches, postTicket } from "@/lib/api";
import { fmtCents, isMatchLocked, oddsForPick, parseMoneyToCents, utcTodayISODate } from "@/lib/betting";
import type { Match, Pick, SlipLeg, Ticket } from "@/lib/types";

export function PlayDashboard() {
  const [bankrollCents, setBankrollCents] = useState<number>(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slateDate, setSlateDate] = useState<string>("");
  const [slip, setSlip] = useState<Record<number, Pick>>({});
  const [stakeText, setStakeText] = useState<string>("50");
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  const utcTodayISO = useMemo(() => utcTodayISODate(), []);
  const lockedCount = useMemo(() => matches.filter((m) => isMatchLocked(m)).length, [matches]);
  const finishedCount = useMemo(() => matches.filter((m) => m.status === "finished").length, [matches]);
  const openTicketsCount = useMemo(() => tickets.filter((ticket) => ticket.status === "open").length, [tickets]);
  const settledTicketsCount = useMemo(() => tickets.filter((ticket) => ticket.status === "settled").length, [tickets]);
  const totalCount = matches.length;
  const stakeCentsOrNull = useMemo(() => parseMoneyToCents(stakeText), [stakeText]);
  const stakeCents = useMemo(() => stakeCentsOrNull ?? 0, [stakeCentsOrNull]);

  const slipLegs: SlipLeg[] = useMemo(() => {
    return Object.entries(slip).map(([matchId, pick]) => ({
      matchId: Number(matchId),
      pick,
    }));
  }, [slip]);

  const slipTotalOdds = useMemo(() => {
    let product = 1;
    for (const leg of slipLegs) {
      const m = matches.find((x) => x.id === leg.matchId);
      if (!m) continue;
      product *= oddsForPick(m, leg.pick);
    }
    return product;
  }, [slipLegs, matches]);

  const slipPotentialReturnCents = useMemo(() => {
    if (stakeCents <= 0) return 0;
    return Math.round(stakeCents * slipTotalOdds);
  }, [stakeCents, slipTotalOdds]);

  const stakeValid = stakeCentsOrNull != null && stakeCentsOrNull > 0;
  const stakeTooHigh = stakeCentsOrNull != null && stakeCentsOrNull > bankrollCents;
  const placeDisabled = slipLegs.length === 0 || !stakeValid || stakeTooHigh;

  const placeDisabledReason = useMemo(() => {
    if (slipLegs.length === 0) return null;
    if (!stakeValid) return "Invalid stake. Use a number with up to 2 decimals (e.g. 10 or 10.50).";
    if (stakeTooHigh) return "Stake is higher than bankroll.";
    return null;
  }, [slipLegs.length, stakeValid, stakeTooHigh]);

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
        setMatches(m.matches ?? []);
        setTickets(t.tickets ?? []);
        setSlateDate(m.slateDate ?? utcTodayISO);
      });
    } catch {
      if (!isMountedRef.current) return;
      showToast("Could not refresh data right now.");
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

  function togglePick(matchId: number, p: Pick) {
    const m = matches.find((x) => x.id === matchId);
    if (m && isMatchLocked(m)) return;

    setSlip((prev) => {
      const current = prev[matchId];
      if (current === p) {
        const next = { ...prev };
        delete next[matchId];
        return next;
      }
      return { ...prev, [matchId]: p };
    });
  }

  function removeFromSlip(matchId: number) {
    setSlip((prev) => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
  }

  function clearSlip() {
    setSlip({});
  }

  function stakeQuick(kind: "plus10" | "plus50" | "plus100" | "max") {
    if (kind === "max") {
      setStakeText((bankrollCents / 100).toFixed(2));
      return;
    }

    const addCents = kind === "plus10" ? 1000 : kind === "plus50" ? 5000 : 10000;
    const next = Math.max(1, stakeCents + addCents);
    setStakeText((next / 100).toFixed(2));
  }

  async function onPlaceTicket() {
    if (slipLegs.length === 0) return showToast("Select at least 1 match.");
    if (!stakeValid) return showToast("Invalid stake.");
    if (stakeTooHigh) return showToast("Stake is higher than bankroll.");

    showToast("Placing ticket...");

    try {
      const stake = (stakeCentsOrNull ?? 0) / 100;
      const j = await postTicket({ stake, legs: slipLegs });

      if (!j.ok) {
        if (Array.isArray(j.lockedMatchIds) && j.lockedMatchIds.length > 0) {
          const names = j.lockedMatchIds
            .map((id: number) => matches.find((m) => m.id === id))
            .filter((m): m is Match => Boolean(m))
            .map((m: Match) => `${m.homeTeam} vs ${m.awayTeam}`);

          const preview = names.slice(0, 2).join(", ");
          const more = names.length > 2 ? ` (+${names.length - 2} more)` : "";
          showToast(names.length ? `Locked matches: ${preview}${more}` : "Some matches are locked and cannot be bet on.");
        } else {
          showToast(j.error ?? "Ticket failed");
        }
        return;
      }

      showToast("Ticket placed ✅");
      clearSlip();
      await refresh();
    } catch {
      showToast("Could not place ticket right now.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900">Bet Wars</div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    Player Area
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    {slateDate || utcTodayISO}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    <b className="font-semibold text-slate-700">{totalCount}</b> matches
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    <b className="font-semibold text-slate-700">{lockedCount}</b> locked
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    <b className="font-semibold text-slate-700">{finishedCount}</b> finished
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-medium text-slate-500">Bankroll</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{fmtCents(bankrollCents)}</span>
                </div>

                <button
                  onClick={refresh}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <ToastBar message={toast} />
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="mb-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Today’s Matches</div>
                <div className="mt-1 text-xs text-slate-500">
                  Click an odds pill to add to slip (1 selection per match)
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                  <b className="font-semibold text-slate-700">{totalCount}</b> matches
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                  <b className="font-semibold text-slate-700">{lockedCount}</b> locked
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                  <b className="font-semibold text-slate-700">{finishedCount}</b> finished
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-5 text-sm text-slate-600 shadow-sm">
                <div className="font-semibold text-slate-900">No matches for today</div>
                <div className="mt-1 text-xs text-slate-500">
                  Ask an admin to reseed the mock slate if you need fresh fixtures.
                </div>
              </div>
            ) : (
              matches.map((m) => (
                <MatchCard key={m.id} match={m} selectedPick={slip[m.id] ?? null} onPick={togglePick} />
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Account Snapshot</div>
                <div className="mt-1 text-xs text-slate-500">Keep betting here, then jump out for deeper history and bankroll analysis.</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right ring-1 ring-slate-200">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Bankroll</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{fmtCents(bankrollCents)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Open tickets</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{openTicketsCount}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Settled</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{settledTicketsCount}</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/bankroll"
                className="w-full rounded-xl bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                View bankroll
              </Link>
              <Link
                href="/tickets"
                className="w-full rounded-xl bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                View tickets
              </Link>
            </div>
          </div>

          <Slip
            slipLegs={slipLegs}
            matches={matches}
            stakeText={stakeText}
            bankrollCents={bankrollCents}
            totalOdds={slipTotalOdds}
            potentialReturnCents={slipPotentialReturnCents}
            onStakeTextChange={setStakeText}
            onStakeQuick={stakeQuick}
            onRemoveLeg={removeFromSlip}
            onClearSlip={clearSlip}
            onPlaceTicket={onPlaceTicket}
            placeDisabled={placeDisabled}
            placeDisabledReason={placeDisabledReason}
          />

          <TicketsList
            tickets={tickets}
            expandedTicketId={expandedTicketId}
            onToggleExpanded={(id) => setExpandedTicketId((prev) => (prev === id ? null : id))}
            maxItems={3}
            title="Recent Tickets"
            footerMessage={
              tickets.length > 3 ? (
                <Link href="/tickets" className="font-medium text-sky-700 hover:text-sky-900">
                  Open full ticket history
                </Link>
              ) : tickets.length > 0 ? (
                <Link href="/tickets" className="font-medium text-sky-700 hover:text-sky-900">
                  Open ticket history
                </Link>
              ) : (
                <Link href="/tickets" className="font-medium text-sky-700 hover:text-sky-900">
                  Ticket history will appear here after your first bet
                </Link>
              )
            }
          />
        </aside>
      </main>
    </div>
  );
}
