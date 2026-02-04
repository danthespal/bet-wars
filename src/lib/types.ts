export type Pick = "1" | "X" | "2";

export type Match = {
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

export type TicketLeg = {
  id: number;
  ticketId: number;
  matchId: number;
  pick: Pick;
  oddsUsed: number;
  status: "open" | "won" | "lost" | "push" | "void" | string;
  settledAt: string | null;
  match: Match;
};

export type Ticket = {
  id: number;
  stakeCents: number;
  totalOdds: number;
  status: "open" | "settled" | "void" | string;
  payoutCents: number | null;
  placedAt: string;
  settledAt: string | null;
  legs: TicketLeg[];
};

export type SlipLeg = {
  matchId: number;
  pick: Pick;
};