"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { Match, Pick, SlipLeg, Ticket } from "@/lib/types";
import { fmtCents, isMatchLocked, oddsForPick, parseMoneyToCents, utcTodayISO as utcTodayISOFn } from "@/lib/betting";
import { fetchBankroll, fetchTickets, fetchTodayMatches, postReset, postSettleMock, postTicket } from "@/lib/api";
import { ToastBar } from "@/app/_components/ToastBar";
import { MatchCard } from "@/app/_components/MatchCard";
import { Slip } from "@/app/_components/Slip";
import { TicketsList } from "@/app/_components/TicketsList";

export default function Home() {
  const [bankrollCents, setBankrollCents] = useState<number>(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slateDate, setSlateDate] = useState<string>("");

  // Slip: one pick per match
  const [slip, setSlip] = useState<Record<number, Pick>>({});
  const [stakeText, setStakeText] = useState<string>("50");

  // UI
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);

  // Ticket expand/collapse
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  const stakeCents = useMemo(() => parseMoneyToCents(stakeText) ?? 0, [stakeText]);

  const utcTodayISO = useMemo(() => utcTodayISOFn(), []);

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

  function showToast(message: string) {
    setToast(message);

    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2500);
  }

  async function refresh() {
    const [b, m, t] = await Promise.all([fetchBankroll(), fetchTodayMatches(), fetchTickets()]);

    startTransition(() => {
      setBankrollCents(b.amountCents ?? 0);
      setMatches(m.matches ?? []);
      setTickets(t.tickets ?? []);
      setSlateDate(m.slateDate ?? utcTodayISO);
    });
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [b, m, t] = await Promise.all([fetchBankroll(), fetchTodayMatches(), fetchTickets()]);
      if (cancelled) return;

      startTransition(() => {
        setBankrollCents(b.amountCents ?? 0);
        setMatches(m.matches ?? []);
        setTickets(t.tickets ?? []);
        setSlateDate(m.slateDate ?? utcTodayISO);
      });
    })();

    return () => {
      cancelled = true;
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, [utcTodayISO]);

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
      const max = Math.max(1, Math.floor(bankrollCents / 100));
      setStakeText(String(max));
      return;
    }

    const addCents = kind === "plus10" ? 1000 : kind === "plus50" ? 5000 : 10000;
    const next = Math.max(1, stakeCents + addCents);
    setStakeText((next / 100).toFixed(2));
  }

  async function onReset() {
    showToast("Resetting & reseeding...");
    const j = await postReset();
    showToast(j.ok ? `Reset ✅ Seeded ${j.matches} matches.` : j.error ?? "Reset failed");
    await refresh();
    clearSlip();
    setExpandedTicketId(null);
  }

  async function onSettleMock() {
    showToast("Settling one match...");
    const j = await postSettleMock();

    if (!j.ok) showToast(j.error ?? "Settle failed");
    else if (j.match) {
      showToast(`FT: ${j.match.homeTeam} ${j.match.scoreHome}-${j.match.scoreAway} ${j.match.awayTeam}`);
    } else showToast(j.message ?? "Done");

    await refresh();
  }

  async function onPlaceTicket() {
    if (slipLegs.length === 0) return showToast("Select at least 1 match.");
    if (stakeCents <= 0) return showToast("Stake must be > 0");

    showToast("Placing ticket...");
    const stake = stakeCents / 100;
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
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">Bet Wars</div>
            <div className="text-xs text-slate-500">Mock Slate • {slateDate || utcTodayISO}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 shadow-sm">
              <span className="text-xs text-slate-500">Bankroll</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{fmtCents(bankrollCents)}</span>
            </div>

            <button
              onClick={refresh}
              className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Refresh
            </button>

            <button
              onClick={onSettleMock}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Settle (mock)
            </button>

            <button
              onClick={onReset}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500"
            >
              Reset
            </button>
          </div>
        </div>

        <ToastBar message={toast} />
      </header>

      {/* Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12">
        {/* Left: Match cards */}
        <section className="lg:col-span-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Today’s Matches</div>
              <div className="text-xs text-slate-500">Click an odds button to add to slip (1 selection per match)</div>
            </div>

            <div className="sm:hidden rounded-full border bg-white px-3 py-1.5 shadow-sm">
              <span className="text-xs text-slate-500">Bankroll</span>{" "}
              <span className="text-sm font-semibold tabular-nums text-slate-900">{fmtCents(bankrollCents)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="rounded-xl border bg-white p-5 text-sm text-slate-600 shadow-sm">
                No matches for today. Use <b>Reset</b>.
              </div>
            ) : (
              matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  selectedPick={slip[m.id] ?? null}
                  onPick={togglePick}
                />
              ))
            )}
          </div>
        </section>

        {/* Right: Slip + Tickets */}
        <aside className="lg:col-span-4 space-y-4">
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
          />

          <TicketsList
            tickets={tickets}
            expandedTicketId={expandedTicketId}
            onToggleExpanded={(id) => setExpandedTicketId((prev) => (prev === id ? null : id))}
          />
        </aside>
      </main>
    </div>
  );
}