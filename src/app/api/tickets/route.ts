import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Match } from "@prisma/client";

type Pick = "1" | "X" | "2";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function getOddsForPick(match: Match, pick: Pick) {
  return pick === "1" ? match.oddsHome : pick === "X" ? match.oddsDraw : match.oddsAway;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const stake = Number(body.stake);
    const legs = body.legs as { matchId: number; pick: Pick }[];

    if (!Number.isFinite(stake) || stake <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid stake" }, { status: 400 });
    }
    if (!Array.isArray(legs) || legs.length === 0) {
      return NextResponse.json({ ok: false, error: "Select at least 1 match" }, { status: 400 });
    }

    // ensure one leg per match
    const uniq = new Set(legs.map((l) => l.matchId));
    if (uniq.size !== legs.length) {
      return NextResponse.json({ ok: false, error: "Only one pick per match" }, { status: 400 });
    }

    // Load matches and compute total odds snapshot
    const matches = await prisma.match.findMany({
      where: { id: { in: legs.map((l) => l.matchId) } },
    });

    if (matches.length !== legs.length) {
      return NextResponse.json({ ok: false, error: "Some matches not found" }, { status: 404 });
    }

    // Compute snapshot odds per leg + totalOdds (accumulator = product)
    const matchById = new Map(matches.map((m) => [m.id, m]));
    const legsWithOdds = legs.map((l) => {
      const m = matchById.get(l.matchId)!;
      const oddsUsed = getOddsForPick(m, l.pick);
      return { ...l, oddsUsed };
    });

    const totalOdds = legsWithOdds.reduce((acc, l) => acc * l.oddsUsed, 1);

    const ticket = await prisma.$transaction(async (tx) => {
      // Ensure bankroll singleton exists.
      await tx.bankroll.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, amount: 1000 },
      });

      // Bankroll-safe (atomic) stake deduction:
      // - perform a conditional decrement inside the same transaction
      // - if no row was updated, bankroll was insufficient at the time of placement
      const updated = await tx.bankroll.updateMany({
        where: {
          id: 1,
          amount: { gte: stake },
        },
        data: {
          amount: { decrement: stake },
        },
      });

      if (updated.count !== 1) {
        throw new HttpError(400, "Insufficient bankroll");
      }

      // create ticket and legs
      const t = await tx.ticket.create({
        data: {
          stake,
          totalOdds,
          legs: {
            create: legsWithOdds.map((l) => ({
              matchId: l.matchId,
              pick: l.pick,
              oddsUsed: l.oddsUsed,
            })),
          },
        },
        include: {
          legs: { include: { match: true } },
        },
      });

      return t;
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (e: unknown) {
    // Prisma transactions generally rethrow user-throw errors as-is, but be defensive
    // in case an error is wrapped with a `cause`.
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    if (typeof e === "object" && e !== null && "cause" in e) {
      const cause = (e as { cause?: unknown }).cause;
      if (cause instanceof HttpError) {
        return NextResponse.json({ ok: false, error: cause.message }, { status: cause.status });
      }
    }
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { placedAt: "desc" },
    include: {
      legs: {
        include: { match: true },
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json({ tickets });
}