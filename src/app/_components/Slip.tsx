"use client";

import type { Match, SlipLeg } from "@/lib/types";
import { fmtMoney, oddsForPick, pickLabel } from "@/lib/betting";

export function Slip({
  slipLegs,
  matches,
  stake,
  bankroll,
  totalOdds,
  potentialReturn,
  onStakeChange,
  onStakeQuick,
  onRemoveLeg,
  onClearSlip,
  onPlaceTicket,
}: {
  slipLegs: SlipLeg[];
  matches: Match[];
  stake: number;
  bankroll: number;
  totalOdds: number;
  potentialReturn: number;
  onStakeChange: (stake: number) => void;
  onStakeQuick: (kind: "plus10" | "plus50" | "plus100" | "max") => void;
  onRemoveLeg: (matchId: number) => void;
  onClearSlip: () => void;
  onPlaceTicket: () => void;
}) {
  return (
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
                      {m.homeTeam} <span className="text-slate-400 font-normal">vs</span> {m.awayTeam}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      Pick <b>{leg.pick}</b> ({pickLabel(leg.pick)}) • Odds{" "}
                      <b className="tabular-nums">{o.toFixed(2)}</b>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveLeg(leg.matchId)}
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
            <button onClick={onClearSlip} className="text-xs font-medium text-slate-600 hover:text-slate-900">
              Clear slip
            </button>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={stake}
            onChange={(e) => onStakeChange(Number(e.target.value))}
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          <button
            onClick={() => onStakeQuick("max")}
            className="rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Max
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <button
            onClick={() => onStakeQuick("plus10")}
            className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            +10
          </button>
          <button
            onClick={() => onStakeQuick("plus50")}
            className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            +50
          </button>
          <button
            onClick={() => onStakeQuick("plus100")}
            className="w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            +100
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Bankroll: <b className="tabular-nums">{fmtMoney(bankroll)}</b>
        </div>
      </div>

      {/* Combined odds + placement */}
      <div className="mt-3 rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
        <div className="flex items-center justify-between">
          <span>Total odds</span>
          <b className="tabular-nums text-slate-900">{slipLegs.length ? totalOdds.toFixed(2) : "-"}</b>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Potential return</span>
          <b className="tabular-nums text-slate-900">
            {slipLegs.length ? fmtMoney(potentialReturn) : "-"}
          </b>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Profit</span>
          <b className="tabular-nums text-slate-900">
            {slipLegs.length ? fmtMoney(potentialReturn - stake) : "-"}
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
  );
}