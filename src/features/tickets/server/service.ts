import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Ticket } from "@/lib/types";

export class TicketServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TicketServiceError";
  }
}

export type TicketLegInput = {
  matchId: number;
  pick: "1" | "X" | "2";
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TicketRecord = Prisma.TicketGetPayload<{
  include: {
    legs: {
      include: { match: true };
    };
  };
}>;

function getOddsForPick(
  match: Pick<Prisma.MatchUncheckedCreateInput, "oddsHome" | "oddsDraw" | "oddsAway">,
  pick: TicketLegInput["pick"]
) {
  return pick === "1" ? match.oddsHome : pick === "X" ? match.oddsDraw : match.oddsAway;
}

function serializeTickets(tickets: TicketRecord[]): Ticket[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    userId: ticket.userId,
    stakeCents: ticket.stakeCents,
    totalOdds: ticket.totalOdds,
    status: ticket.status,
    payoutCents: ticket.payoutCents,
    placedAt: ticket.placedAt.toISOString(),
    settledAt: ticket.settledAt?.toISOString() ?? null,
    legs: ticket.legs.map((leg) => ({
      id: leg.id,
      ticketId: leg.ticketId,
      matchId: leg.matchId,
      pick: leg.pick as Ticket["legs"][number]["pick"],
      oddsUsed: leg.oddsUsed,
      status: leg.status,
      settledAt: leg.settledAt?.toISOString() ?? null,
      match: {
        id: leg.match.id,
        homeTeam: leg.match.homeTeam,
        awayTeam: leg.match.awayTeam,
        commenceTimeUTC: leg.match.commenceTimeUTC,
        oddsHome: leg.match.oddsHome,
        oddsDraw: leg.match.oddsDraw,
        oddsAway: leg.match.oddsAway,
        status: leg.match.status,
        scoreHome: leg.match.scoreHome,
        scoreAway: leg.match.scoreAway,
      },
    })),
  }));
}

export async function listUserTickets(userId: number, db: DbClient = prisma): Promise<Ticket[]> {
  const records = await db.ticket.findMany({
    where: { userId },
    orderBy: { placedAt: "desc" },
    include: {
      legs: {
        include: { match: true },
        orderBy: { id: "asc" },
      },
    },
  });

  return serializeTickets(records);
}

export function summarizeTickets(tickets: Ticket[]) {
  const openTickets = tickets.filter((ticket) => ticket.status === "open");
  const settledTickets = tickets.filter((ticket) => ticket.status === "settled");
  const wonTickets = settledTickets.filter((ticket) => (ticket.payoutCents ?? 0) > 0);

  return {
    totalTickets: tickets.length,
    openTicketsCount: openTickets.length,
    settledTicketsCount: settledTickets.length,
    wonTicketsCount: wonTickets.length,
    lostTicketsCount: settledTickets.length - wonTickets.length,
    openExposureCents: openTickets.reduce((total, ticket) => total + ticket.stakeCents, 0),
  };
}

export async function createTicketForUser(
  userId: number,
  input: { stakeCents: number; legs: TicketLegInput[] }
) {
  if (!Number.isFinite(input.stakeCents) || input.stakeCents <= 0) {
    throw new TicketServiceError(400, "Invalid stake");
  }

  const uniqueMatchIds = new Set(input.legs.map((leg) => leg.matchId));
  if (uniqueMatchIds.size !== input.legs.length) {
    throw new TicketServiceError(400, "Only one pick per match");
  }

  const matches = await prisma.match.findMany({
    where: { id: { in: input.legs.map((leg) => leg.matchId) } },
  });

  if (matches.length !== input.legs.length) {
    throw new TicketServiceError(404, "Some matches not found");
  }

  const nowMs = Date.now();
  const lockedMatchIds: number[] = [];

  for (const match of matches) {
    if (match.status !== "scheduled") {
      lockedMatchIds.push(match.id);
      continue;
    }

    const kickoffMs = Date.parse(match.commenceTimeUTC);
    if (!Number.isFinite(kickoffMs) || nowMs >= kickoffMs) {
      lockedMatchIds.push(match.id);
    }
  }

  if (lockedMatchIds.length > 0) {
    throw new TicketServiceError(400, "Some matches are locked and cannot be bet on.", {
      lockedMatchIds,
    });
  }

  const matchById = new Map(matches.map((match) => [match.id, match]));
  const legsWithOdds = input.legs.map((leg) => {
    const match = matchById.get(leg.matchId)!;
    return {
      ...leg,
      oddsUsed: getOddsForPick(match, leg.pick),
    };
  });

  const totalOdds = legsWithOdds.reduce((total, leg) => total * leg.oddsUsed, 1);

  const created = await prisma.$transaction(async (tx) => {
    const updated = await tx.bankroll.updateMany({
      where: { userId, amountCents: { gte: input.stakeCents } },
      data: { amountCents: { decrement: input.stakeCents } },
    });

    if (updated.count !== 1) {
      throw new TicketServiceError(400, "Insufficient bankroll");
    }

    return tx.ticket.create({
      data: {
        userId,
        stakeCents: input.stakeCents,
        totalOdds,
        legs: {
          create: legsWithOdds.map((leg) => ({
            matchId: leg.matchId,
            pick: leg.pick,
            oddsUsed: leg.oddsUsed,
          })),
        },
      },
      include: {
        legs: {
          include: { match: true },
          orderBy: { id: "asc" },
        },
      },
    });
  });

  return serializeTickets([created])[0];
}
