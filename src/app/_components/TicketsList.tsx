"use client";

import type { Ticket } from "@/lib/types";
import { fmtCents, pickLabel } from "@/lib/betting";

function ticketStatusPill(t: Ticket) {
  if (t.status === "settled") {
    const won = (t.payoutCents ?? 0) > 0;
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

export function TicketsList({
  tickets,
  expandedTicketId,
  onToggleExpanded,
}: {
  tickets: Ticket[];
  expandedTicketId: number | null;
  onToggleExpanded: (ticketId: number) => void;
}) {
  return (
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
            const potentialCents = Math.round(t.stakeCents * t.totalOdds);

            return (
              <div key={t.id} className="rounded-lg border bg-white">
                <button
                  onClick={() => onToggleExpanded(t.id)}
                  className="w-full p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">Ticket #{t.id}</div>
                        {ticketStatusPill(t)}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Legs <b>{t.legs.length}</b>
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Stake <b className="tabular-nums">{fmtCents(t.stakeCents)}</b>
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Odds <b className="tabular-nums">{t.totalOdds.toFixed(2)}</b>
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Return <b className="tabular-nums">{fmtCents(potentialCents)}</b>
                        </span>

                        {t.status === "settled" && (
                          <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                            Payout{" "}
                            <b className="tabular-nums">
                              {t.payoutCents == null ? "-" : fmtCents(t.payoutCents)}
                            </b>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-slate-500">{expanded ? "Hide" : "View"}</div>
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
            <div className="text-xs text-slate-500">Showing latest 8 tickets. (We can add pagination next.)</div>
          )}
        </div>
      )}
    </div>
  );
}