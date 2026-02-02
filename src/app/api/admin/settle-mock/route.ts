import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Pick = "1" | "X" | "2";

function outcomeFromScore(h: number, a: number): Pick {
  if (h > a) return "1";
  if (h < a) return "2";
  return "X";
}

// Simple score generator (not realistic yet, but good for mechanic tests)
function randomScore(): { home: number; away: number } {
  const home = Math.floor(Math.random() * 4); // 0..3
  const away = Math.floor(Math.random() * 4);
  return { home, away };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST() {
  const scheduled = await prisma.match.findMany({
    where: { status: "scheduled" },
    orderBy: { id: "asc" },
  });

  if (scheduled.length === 0) {
    return NextResponse.json({ ok: true, message: "No scheduled matches left to settle." });
  }

  const match = scheduled[Math.floor(Math.random() * scheduled.length)];
  const score = randomScore();
  const resultPick = outcomeFromScore(score.home, score.away);

  const settled = await prisma.$transaction(async (tx) => {
    // mark match finished
    const updatedMatch = await tx.match.update({
      where: { id: match.id },
      data: {
        status: "finished",
        scoreHome: score.home,
        scoreAway: score.away,
      },
    });

    // settle all open legs for this match
    const legs = await tx.ticketLeg.findMany({
      where: { matchId: match.id, status: "open" },
    });

    const affectedTicketIds = new Set<number>();

    for (const leg of legs) {
      affectedTicketIds.add(leg.ticketId);
      const legWon = leg.pick === resultPick;

      await tx.ticketLeg.update({
        where: { id: leg.id },
        data: {
          status: legWon ? "won" : "lost",
          settledAt: new Date(),
        },
      });
    }

    let ticketsSettled = 0;
    let totalPayout = 0;

    for (const ticketId of affectedTicketIds) {
      const t = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { legs: true },
      });

      if (!t) continue;
      if (t.status !== "open") continue;

      const anyOpen = t.legs.some((l) => l.status === "open");
      if (anyOpen) continue;

      const anyLost = t.legs.some((l) => l.status === "lost");
      const effectiveOdds = t.legs.reduce((acc, l) => {
        if (l.status === "void" || l.status === "push") return acc * 1;
        return acc * l.oddsUsed;
      }, 1);

      const payout = anyLost ? 0 : round2(t.stake * effectiveOdds);

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: "settled",
          payout,
          settledAt: new Date(),
          totalOdds: round2(effectiveOdds),
        },
      });

      if (payout > 0) {
        await tx.bankroll.update({
          where: { id: 1 },
          data: { amount: { increment: payout } },
        });
      }

      ticketsSettled += 1;
      totalPayout += payout;
    }

    const bankroll = await tx.bankroll.findUnique({ where: { id: 1 } });

    return {
      updatedMatch,
      resultPick,
      legsSettled: legs.length,
      ticketsSettled,
      totalPayout: round2(totalPayout),
      bankroll: bankroll?.amount ?? 0,
    };
  });

  return NextResponse.json({
    ok: true,
    match: settled.updatedMatch,
    resultPick: settled.resultPick,
    legsSettled: settled.legsSettled,
    ticketsSettled: settled.ticketsSettled,
    totalPayout: settled.totalPayout,
    bankroll: settled.bankroll,
  });
}
