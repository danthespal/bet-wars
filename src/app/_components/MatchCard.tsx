"use client";

import type { Match, Pick } from "@/lib/types";
import { formatKickoffUTC, isMatchLocked } from "@/lib/betting";

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

  if (isMatchLocked(match)) {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
        LOCKED
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      Scheduled
    </span>
  );
}

export function MatchCard({
  match,
  selectedPick,
  onPick,
}: {
  match: Match;
  selectedPick: Pick | null;
  onPick: (matchId: number, pick: Pick) => void;
}) {
  const locked = isMatchLocked(match);

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
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {match.homeTeam} <span className="text-slate-400 font-normal">vs</span> {match.awayTeam}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Kickoff (UTC): <span className="font-medium">{formatKickoffUTC(match.commenceTimeUTC)}</span>
          </div>
        </div>
        <div className="shrink-0">{statusPill(match)}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button disabled={locked} className={pickBtnClass("1")} onClick={() => onPick(match.id, "1")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">1</span>
            <span>{match.oddsHome.toFixed(2)}</span>
          </div>
        </button>

        <button disabled={locked} className={pickBtnClass("X")} onClick={() => onPick(match.id, "X")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">X</span>
            <span>{match.oddsDraw.toFixed(2)}</span>
          </div>
        </button>

        <button disabled={locked} className={pickBtnClass("2")} onClick={() => onPick(match.id, "2")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">2</span>
            <span>{match.oddsAway.toFixed(2)}</span>
          </div>
        </button>
      </div>
    </div>
  );
}