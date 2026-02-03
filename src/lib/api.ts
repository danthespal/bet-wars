import type { Match, Ticket, SlipLeg } from "./types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchBankroll(): Promise<{ amount: number }> {
  return getJSON<{ amount: number }>("/api/bankroll");
}

export async function fetchTodayMatches(): Promise<{ slateDate: string; matches: Match[] }> {
  return getJSON<{ slateDate: string; matches: Match[] }>("/api/matches/today");
}

export async function fetchTickets(): Promise<{ tickets: Ticket[] }> {
  return getJSON<{ tickets: Ticket[] }>("/api/tickets");
}

export type ResetResponse =
  | { ok: true; slateDate: string; matches: number; bankroll: number }
  | { ok: false; error?: string };

export async function postReset(): Promise<ResetResponse> {
  const res = await fetch("/api/admin/reset", { method: "POST" });
  return (await res.json()) as ResetResponse;
}

export type SettleMockResponse =
  | { ok: true; match?: { homeTeam: string; awayTeam: string; scoreHome: number; scoreAway: number }; message?: string }
  | { ok: false; error?: string };

export async function postSettleMock(): Promise<SettleMockResponse> {
  const res = await fetch("/api/admin/settle-mock", { method: "POST" });
  return (await res.json()) as SettleMockResponse;
}

export type PostTicketOk = { ok: true; ticket: Ticket };
export type PostTicketFail = { ok: false; error?: string; lockedMatchIds?: number[] };
export type PostTicketResponse = PostTicketOk | PostTicketFail;

export async function postTicket(payload: { stake: number; legs: SlipLeg[] }): Promise<PostTicketResponse> {
  const res = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as PostTicketResponse;
}