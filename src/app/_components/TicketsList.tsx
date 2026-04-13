"use client";

import type { ReactNode } from "react";
import type { Ticket } from "@/lib/types";
import { fmtCents, formatKickoffUTC, pickLabel } from "@/lib/betting";

function ticketStatusPill(t: Ticket) {
  if (t.status === "settled") {
    const won = (t.payoutCents ?? 0) > 0;
    return (
      <span
        className={
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 " +
          (won ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200")
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
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      OPEN
    </span>
  );
}

function legStatusGlyph(status: string) {
  const s = String(status).toLowerCase();
  if (s === "won") return "✓";
  if (s === "lost") return "×";
  if (s === "void" || s === "push") return "–";
  return "⏳";
}

export function TicketsList({
  tickets,
  expandedTicketId,
  onToggleExpanded,
  maxItems = 8,
  title = "My Tickets",
  emptyMessage = "No tickets yet.",
  footerMessage,
}: {
  tickets: Ticket[];
  expandedTicketId: number | null;
  onToggleExpanded: (ticketId: number) => void;
  maxItems?: number | null;
  title?: string;
  emptyMessage?: string;
  footerMessage?: ReactNode;
}) {
  const visibleTickets = maxItems == null ? tickets : tickets.slice(0, maxItems);

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">Total {tickets.length}</div>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-3 text-sm text-slate-600">{emptyMessage}</div>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleTickets.map((t) => {
            const expanded = expandedTicketId === t.id;

            const potentialCents = Math.round(t.stakeCents * t.totalOdds);
            const payoutCents = t.payoutCents ?? null;

            return (
              <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                <button onClick={() => onToggleExpanded(t.id)} className="w-full p-3 text-left hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">Ticket #{t.id}</div>
                        {ticketStatusPill(t)}
                        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {t.legs.length}-leg
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-600">
                        <span className="font-medium">Stake</span>{" "}
                        <span className="font-semibold tabular-nums text-slate-900">{fmtCents(t.stakeCents)}</span>
                        <span className="text-slate-400"> → </span>
                        <span className="font-medium">Return</span>{" "}
                        <span className="font-semibold tabular-nums text-slate-900">{fmtCents(potentialCents)}</span>
                        {t.status === "settled" && (
                          <>
                            <span className="text-slate-400"> • </span>
                            <span className="font-medium">Payout</span>{" "}
                            <span className="font-semibold tabular-nums text-slate-900">
                              {payoutCents == null ? "-" : fmtCents(payoutCents)}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Odds <b className="tabular-nums">{t.totalOdds.toFixed(2)}</b>
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                          Placed <b className="tabular-nums">{formatKickoffUTC(t.placedAt, true)}</b>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-slate-500">{expanded ? "Hide" : "View"}</div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-200/70 bg-slate-50 p-3">
                    <div className="space-y-2">
                      {t.legs.map((leg) => (
                        <div key={leg.id} className="rounded-2xl border border-slate-200/70 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {leg.match.homeTeam} <span className="font-normal text-slate-400">vs</span>{" "}
                                {leg.match.awayTeam}
                              </div>

                              <div className="mt-1 text-xs text-slate-500">
                                Kickoff{" "}
                                <span className="font-medium">{formatKickoffUTC(leg.match.commenceTimeUTC, true)}</span>
                              </div>

                              <div className="mt-1 text-xs text-slate-600">
                                <span className="font-medium">Pick</span>{" "}
                                <span className="font-semibold text-slate-900">{leg.pick}</span>{" "}
                                <span className="text-slate-500">({pickLabel(leg.pick)})</span>
                                <span className="text-slate-400"> • </span>
                                <span className="font-medium">Odds</span>{" "}
                                <span className="font-semibold tabular-nums text-slate-900">{leg.oddsUsed.toFixed(2)}</span>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                              <span aria-hidden="true">{legStatusGlyph(String(leg.status))}</span>
                              <span>{String(leg.status).toUpperCase()}</span>
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

          {footerMessage ? (
            <div className="text-xs text-slate-500">{footerMessage}</div>
          ) : (
            maxItems != null &&
            tickets.length > maxItems && (
              <div className="text-xs text-slate-500">
                Showing latest {maxItems} tickets. (We can add pagination next.)
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
