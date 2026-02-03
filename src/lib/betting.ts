import type { Match, Pick } from "./types";

export function pickLabel(p: Pick) {
    return p === "1" ? "Home" : p === "X" ? "Draw" : "Away";
}

export function fmtMoney(n: number) {
    return n.toFixed(2);
}

export function oddsForPick(m: Match, p: Pick) {
    return p === "1" ? m.oddsHome : p === "X" ? m.oddsDraw : m.oddsAway;
}

export function isMatchLocked(m: Match) {
    if (m.status !== "scheduled") return true;
    const kickoffMs = Date.parse(m.commenceTimeUTC);
    if (!Number.isFinite(kickoffMs)) return true;
    return Date.now() >= kickoffMs;
}

export function utcTodayISO() {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}