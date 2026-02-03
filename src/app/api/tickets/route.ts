import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Match } from "@prisma/client";
import * as z from "zod";

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const PickSchema = z.enum(["1", "X", "2"]);
type Pick = z.infer<typeof PickSchema>;

const TicketLegSchema = z
  .object({
    matchId: z.number().int().positive(),
    pick: PickSchema,
  })
  .strict();

const CreateTicketSchema = z
  .object({
    stake: z.number().finite().gt(0).max(1_000_000),
    legs: z.array(TicketLegSchema).min(1).max(20),
  })
  .strict();

function getOddsForPick(match: Match, pick: Pick) {
  return pick === "1" ? match.oddsHome : pick === "X" ? match.oddsDraw : match.oddsAway;
}

function badRequest(error: string, details?: unknown) {
  return NextResponse.json({ ok: false, error, details }, { status: 400 });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    }));
    return badRequest("Invalid request", details);
  }

  const { stake, legs } = parsed.data;

  try {
    const uniq = new Set(legs.map((l) => l.matchId));
    if (uniq.size !== legs.length) {
      return badRequest("Only one pick per match");
    }

    const matches = await prisma.match.findMany({
      where: { id: { in: legs.map((l) => l.matchId) } },
    });

    if (matches.length !== legs.length) {
      return NextResponse.json({ ok: false, error: "Some matches not found" }, { status: 404 });
    }

    const matchById = new Map(matches.map((m) => [m.id, m]));
    const legsWithOdds = legs.map((l) => {
      const m = matchById.get(l.matchId)!;
      const oddsUsed = getOddsForPick(m, l.pick);
      return { ...l, oddsUsed };
    });

    const totalOdds = legsWithOdds.reduce((acc, l) => acc * l.oddsUsed, 1);

    const ticket = await prisma.$transaction(async (tx) => {
      await tx.bankroll.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, amount: 1000 },
      });

      const updated = await tx.bankroll.updateMany({
        where: { id: 1, amount: { gte: stake } },
        data: { amount: { decrement: stake } },
      });

      if (updated.count !== 1) {
        throw new HttpError(400, "Insufficient bankroll");
      }

      return tx.ticket.create({
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
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
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