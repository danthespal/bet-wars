"use client";

import type { Match, Pick } from "@/lib/types";
import { formatKickoffUTC, isMatchLocked } from "@/lib/betting";

function statusRailClass(match: Match) {
  if (match.status === "finished") return "bg-emerald-300";
  if (match.status === "void") return "bg-amber-300";
  if (isMatchLocked(match)) return "bg-amber-300";
  return "bg-slate-200";
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

  if (isMatchLocked(match)) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
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
    "w-full rounded-xl px-3 py-2 text-sm font-semibold tabular-nums transition " +
    "ring-1 ring-slate-200 bg-slate-50 hover:bg-slate-100 " +
    "disabled:cursor-not-allowed disabled:opacity-60";

  const pickBtnClass = (p: Pick) => {
    const active = selectedPick === p;
    return (
      oddsBtnBase +
      (active ? " bg-slate-900 text-white ring-slate-900 hover:bg-slate-800" : " text-slate-900")
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      {/* status rail */}
      <div className={`absolute left-0 top-0 h-full w-1.5 ${statusRailClass(match)}`} />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {match.homeTeam} <span className="font-normal text-slate-400">vs</span> {match.awayTeam}
          </div>
          <div className="mt-1 text-xs text-slate-500">ENG L1</div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            {formatKickoffUTC(match.commenceTimeUTC)}
          </span>
          {statusPill(match)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 pl-2">
        <button disabled={locked} className={pickBtnClass("1")} onClick={() => onPick(match.id, "1")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-70">1</span>
            <span>{match.oddsHome.toFixed(2)}</span>
          </div>
        </button>

        <button disabled={locked} className={pickBtnClass("X")} onClick={() => onPick(match.id, "X")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-70">X</span>
            <span>{match.oddsDraw.toFixed(2)}</span>
          </div>
        </button>

        <button disabled={locked} className={pickBtnClass("2")} onClick={() => onPick(match.id, "2")}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-70">2</span>
            <span>{match.oddsAway.toFixed(2)}</span>
          </div>
        </button>
      </div>
    </div>
  );
}