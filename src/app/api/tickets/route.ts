import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Match } from "@prisma/client";

type Pick = "1" | "X" | "2";

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

    // Check bankroll
    const bankroll = await prisma.bankroll.findUnique({ where: { id: 1 } });
    const amount = bankroll?.amount ?? 0;
    if (amount < stake) {
      return NextResponse.json({ ok: false, error: "Insufficient bankroll" }, { status: 400 });
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
      // deduct stake once
      await tx.bankroll.upsert({
        where: { id: 1 },
        update: { amount: amount - stake },
        create: { id: 1, amount: 1000 - stake },
      });

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