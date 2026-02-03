"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";

type Pick = "1" | "X" | "2";

type Match = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  commenceTimeUTC: string;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  status: "scheduled" | "finished" | "void" | string;
  scoreHome: number | null;
  scoreAway: number | null;
};

type TicketLeg = {
  id: number;
  ticketId: number;
  matchId: number;
  pick: Pick;
  oddsUsed: number;
  status: "open" | "won" | "lost" | "push" | "void" | string;
  settledAt: string | null;
  match: Match;
};

type Ticket = {
  id: number;
  stake: number;
  totalOdds: number;
  status: "open" | "settled" | "void" | string;
  payout: number | null;
  placedAt: string;
  settledAt: string | null;
  legs: TicketLeg[];
};

function pickLabel(p: Pick) {
  return p === "1" ? "Home" : p === "X" ? "Draw" : "Away";
}

function fmtMoney(n: number) {
  return n.toFixed(2);
}

function oddsForPick(m: Match, p: Pick) {
  return p === "1" ? m.oddsHome : p === "X" ? m.oddsDraw : m.oddsAway;
}

function statusPill(match: Match) {
  if (match.status === "finished") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
        FT {match.scoreHome}-{match.scoreAway}
      </span>
    );
  }
  if (match.status === "void") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
        VOID
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      Scheduled
    </span>
  );
}

function ticketStatusPill(t: Ticket) {
  if (t.status === "settled") {
    const won = (t.payout ?? 0) > 0;
    return (
      <span
        className={
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 " +
          (won
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-rose-50 text-rose-700 ring-rose-200")
        }
      >
        {won ? "WON" : "LOST"}
      </span>
    );
  }
  if (t.status === "void") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
        VOID
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      OPEN
    </span>
  );
}

export default function Home() {
  const [bankroll, setBankroll] = useState<number>(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [slateDate, setSlateDate] = useState<string>("");

  // Slip: one pick per match
  const [slip, setSlip] = useState<Record<number, Pick>>({});
  const [stake, setStake] = useState<number>(50);

  // UI
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);

  // Ticket expand/collapse
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null);

  const utcTodayISO = useMemo(() => {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const slipLegs = useMemo(() => {
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

  const slipPotentialReturn = useMemo(() => {
    if (!Number.isFinite(stake) || stake <= 0) return 0;
    return stake * slipTotalOdds;
  }, [stake, slipTotalOdds]);

  function showToast(message: string) {
    setToast(message);

    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);

    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2500);
  }

  async function refresh() {
    const [b, m, t] = await Promise.all([
      fetch("/api/bankroll", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/matches/today", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/tickets", { cache: "no-store" }).then((r) => r.json()),
    ]);

    startTransition(() => {
      setBankroll(b.amount ?? 0);
      setMatches(m.matches ?? []);
      setTickets(t.tickets ?? []);
      setSlateDate(m.slateDate ?? utcTodayISO);
    });
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [b, m, t] = await Promise.all([
        fetch("/api/bankroll", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/matches/today", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/tickets", { cache: "no-store" }).then((r) => r.json()),
      ]);

      if (cancelled) return;

      startTransition(() => {
        setBankroll(b.amount ?? 0);
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
    setSlip((prev) => {
      const current = prev[matchId];
      // click same pick again -> remove selection
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
      setStake(Math.max(1, Math.floor(bankroll)));
      return;
    }
    const add = kind === "plus10" ? 10 : kind === "plus50" ? 50 : 100;
    setStake((s) => Math.max(1, Math.round((s + add) * 100) / 100));
  }

  async function onReset() {
    showToast("Resetting & reseeding...");
    const res = await fetch("/api/admin/reset", { method: "POST" });
    const j = await res.json();
    showToast(j.ok ? `Reset ✅ Seeded ${j.matches} matches.` : j.error ?? "Reset failed");
    await refresh();
    clearSlip();
    setExpandedTicketId(null);
  }

  async function onSettleMock() {
    showToast("Settling one match...");
    const res = await fetch("/api/admin/settle-mock", { method: "POST" });
    const j = await res.json();

    if (!j.ok) showToast(j.error ?? "Settle failed");
    else if (j.match) {
      showToast(`FT: ${j.match.homeTeam} ${j.match.scoreHome}-${j.match.scoreAway} ${j.match.awayTeam}`);
    } else showToast(j.message ?? "Done");

    await refresh();
  }

  async function onPlaceTicket() {
    if (slipLegs.length === 0) return showToast("Select at least 1 match.");
    if (!Number.isFinite(stake) || stake <= 0) return showToast("Stake must be > 0.");

    showToast("Placing ticket...");
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stake, legs: slipLegs }),
    });

    const j = await res.json();
    if (!j.ok) {
      showToast(j.error ?? "Ticket failed");
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
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {fmtMoney(bankroll)}
              </span>
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

        {toast && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              {toast}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12">
        {/* Left: Match cards */}
        <section className="lg:col-span-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Today’s Matches</div>
              <div className="text-xs text-slate-500">
                Click an odds button to add to slip (1 selection per match)
              </div>
            </div>

            <div className="sm:hidden rounded-full border bg-white px-3 py-1.5 shadow-sm">
              <span className="text-xs text-slate-500">Bankroll</span>{" "}
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {fmtMoney(bankroll)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="rounded-xl border bg-white p-5 text-sm text-slate-600 shadow-sm">
                No matches for today. Use <b>Reset</b>.
              </div>
            ) : (
              matches.map((m) => {
                const selectedPick = slip[m.id] ?? null;

                const oddsBtnBase =
                  "w-full rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums transition " +
                  "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

                const pickBtnClass = (p: Pick) => {
                  const active = selectedPick === p;
                  return (
                    oddsBtnBase +
                    (active
                      ? " border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                      : " bg-white text-slate-900")
                  );
                };

                return (
                  <div key={m.id} className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {m.homeTeam}{" "}
                          <span className="text-slate-400 font-normal">vs</span>{" "}
                          {m.awayTeam}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Kickoff (UTC):{" "}
                          <span className="font-medium">{m.commenceTimeUTC}</span>
                        </div>
                      </div>
                      <div className="shrink-0">{statusPill(m)}</div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button className={pickBtnClass("1")} onClick={() => togglePick(m.id, "1")}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium opacity-80">1</span>
                          <span>{m.oddsHome.toFixed(2)}</span>
                        </div>
                      </button>

                      <button className={pickBtnClass("X")} onClick={() => togglePick(m.id, "X")}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium opacity-80">X</span>
                          <span>{m.oddsDraw.toFixed(2)}</span>
                        </div>
                      </button>

                      <button className={pickBtnClass("2")} onClick={() => togglePick(m.id, "2")}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium opacity-80">2</span>
                          <span>{m.oddsAway.toFixed(2)}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right: Slip + Tickets */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Slip */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Bet Slip</div>
              <div className="text-xs text-slate-500">
                Selections: <b>{slipLegs.length}</b>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {slipLegs.length === 0 ? (
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                  Select odds from match cards to build a ticket.
                </div>
              ) : (
                slipLegs.map((leg) => {
                  const m = matches.find((x) => x.id === leg.matchId);
                  if (!m) return null;

                  const o = oddsForPick(m, leg.pick);

                  return (
                    <div key={leg.matchId} className="rounded-lg border bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {m.homeTeam} <span className="text-slate-400 font-normal">vs</span>{" "}
                            {m.awayTeam}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            Pick <b>{leg.pick}</b> ({pickLabel(leg.pick)}) • Odds{" "}
                            <b className="tabular-nums">{o.toFixed(2)}</b>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromSlip(leg.matchId)}
                          className="shrink-0 rounded-lg border bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          title="Remove selection"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Stake */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700">Stake</label>
                {slipLegs.length > 0 && (
                  <button
                    onClick={clearSlip}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Clear slip
                  </button>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <button
                  onClick={() => stakeQuick("max")}
                  className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Max
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => stakeQuick("plus10")}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  +10
                </button>
                <button
                  onClick={() => stakeQuick("plus50")}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  +50
                </button>
                <button
                  onClick={() => stakeQuick("plus100")}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  +100
                </button>
              </div>
            </div>

            {/* Combined odds + placement */}
            <div className="mt-3 rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span>Total odds</span>
                <b className="tabular-nums text-slate-900">{slipLegs.length ? slipTotalOdds.toFixed(2) : "-"}</b>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Potential return</span>
                <b className="tabular-nums text-slate-900">
                  {slipLegs.length ? fmtMoney(slipPotentialReturn) : "-"}
                </b>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Profit</span>
                <b className="tabular-nums text-slate-900">
                  {slipLegs.length ? fmtMoney(slipPotentialReturn - stake) : "-"}
                </b>
              </div>
            </div>

            <button
              onClick={onPlaceTicket}
              disabled={slipLegs.length === 0}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Place Ticket
            </button>
          </div>

          {/* Tickets list */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">My Tickets</div>
              <div className="text-xs text-slate-500">Total {tickets.length}</div>
            </div>

            {tickets.length === 0 ? (
              <div className="mt-3 text-sm text-slate-600">No tickets yet.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {tickets.slice(0, 8).map((t) => {
                  const expanded = expandedTicketId === t.id;
                  const potential = t.stake * t.totalOdds;

                  return (
                    <div key={t.id} className="rounded-lg border bg-white">
                      <button
                        onClick={() => setExpandedTicketId(expanded ? null : t.id)}
                        className="w-full p-3 text-left hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">
                                Ticket #{t.id}
                              </div>
                              {ticketStatusPill(t)}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                Legs <b>{t.legs.length}</b>
                              </span>
                              <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                Stake <b className="tabular-nums">{fmtMoney(t.stake)}</b>
                              </span>
                              <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                Odds <b className="tabular-nums">{t.totalOdds.toFixed(2)}</b>
                              </span>
                              <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                Return <b className="tabular-nums">{fmtMoney(potential)}</b>
                              </span>

                              {t.status === "settled" && (
                                <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                                  Payout{" "}
                                  <b className="tabular-nums">{t.payout == null ? "-" : fmtMoney(t.payout)}</b>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-xs text-slate-500">
                            {expanded ? "Hide" : "View"}
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t bg-slate-50 p-3">
                          <div className="space-y-2">
                            {t.legs.map((leg) => (
                              <div key={leg.id} className="rounded-lg border bg-white p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">
                                      {leg.match.homeTeam}{" "}
                                      <span className="text-slate-400 font-normal">vs</span>{" "}
                                      {leg.match.awayTeam}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600">
                                      Pick <b>{leg.pick}</b> ({pickLabel(leg.pick)}) • Odds{" "}
                                      <b className="tabular-nums">{leg.oddsUsed.toFixed(2)}</b>
                                    </div>
                                  </div>
                                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                                    {String(leg.status).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {tickets.length > 8 && (
                  <div className="text-xs text-slate-500">
                    Showing latest 8 tickets. (We can add pagination next.)
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}