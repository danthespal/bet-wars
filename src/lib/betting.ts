import type { Match, Pick } from "./types";

export function pickLabel(p: Pick) {
  return p === "1" ? "Home" : p === "X" ? "Draw" : "Away";
}

export function fmtCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export function parseMoneyToCents(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  const cents = Math.round(n * 100);
  if (!Number.isFinite(cents)) return null;

  return cents;
}

export function normalizeMoneyInput(input: string): string {
  const cents = parseMoneyToCents(input);
  if (cents == null) return input.trim();
  return (cents / 100).toFixed(2);
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

export function formatKickoffUTC(iso: string, withDate = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");

  return withDate ? `${yyyy}-${mm}-${dd} ${hh}:${min} UTC` : `${hh}:${min} UTC`;
}

export function utcTodayISODate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}