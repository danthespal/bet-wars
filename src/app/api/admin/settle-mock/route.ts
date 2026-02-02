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

export async function POST() {
  const scheduled = await prisma.match.findMany({
    where: { status: "scheduled" },
    orderBy: { id: "asc" },
  });

  if (scheduled.length === 0) {
    return NextResponse.json({ ok: true, message: "No scheduled matches left to settle." });
  }

  // Pick one match to finish
  const match = scheduled[Math.floor(Math.random() * scheduled.length)];
  const score = randomScore();
  const resultPick = outcomeFromScore(score.home, score.away);

  const settled = await prisma.$transaction(async (tx) => {
    // 1) mark match finished
    const updatedMatch = await tx.match.update({
      where: { id: match.id },
      data: {
        status: "finished",
        scoreHome: score.home,
        scoreAway: score.away,
      },
    });

    // -----------------------------
    // 2) Settle SINGLE bets (existing)
    // -----------------------------
    const openBets = await tx.bet.findMany({
      where: { matchId: match.id, status: "open" },
    });

    let totalPayoutFromBets = 0;

    for (const b of openBets) {
      const won = b.pick === resultPick;
      const payout = won ? Number((b.stake * b.oddsUsed).toFixed(2)) : 0;

      await tx.bet.update({
        where: { id: b.id },
        data: {
          status: "settled",
          payout,
          settledAt: new Date(),
        },
      });

      totalPayoutFromBets += payout;
    }

    // -----------------------------
    // 3) Settle TICKET legs + tickets (NEW)
    // -----------------------------
    const openLegs = await tx.ticketLeg.findMany({
      where: { matchId: match.id, status: "open" },
      select: { id: true, ticketId: true, pick: true },
    });

    // Update each leg to won/lost
    for (const leg of openLegs) {
      const legStatus = leg.pick === resultPick ? "won" : "lost";
      await tx.ticketLeg.update({
        where: { id: leg.id },
        data: { status: legStatus, settledAt: new Date() },
      });
    }

    // Determine which tickets might now settle
    const affectedTicketIds = Array.from(new Set(openLegs.map((l) => l.ticketId)));

    let totalPayoutFromTickets = 0;
    let ticketsSettledCount = 0;

    for (const ticketId of affectedTicketIds) {
      const t = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { legs: true },
      });

      if (!t) continue;
      if (t.status !== "open") continue; // already settled/void

      const hasLost = t.legs.some((l) => l.status === "lost");
      const stillOpen = t.legs.some((l) => l.status === "open");

      if (hasLost) {
        // Ticket is dead -> settled, payout 0
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: "settled",
            payout: 0,
            settledAt: new Date(),
          },
        });
        ticketsSettledCount += 1;
        continue;
      }

      if (!stillOpen) {
        // All legs resolved and none lost -> WIN
        const payout = Number((t.stake * t.totalOdds).toFixed(2));

        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            status: "settled",
            payout,
            settledAt: new Date(),
          },
        });

        totalPayoutFromTickets += payout;
        ticketsSettledCount += 1;
      }
    }

    // -----------------------------
    // 4) credit bankroll with total payouts
    // -----------------------------
    const totalPayout = totalPayoutFromBets + totalPayoutFromTickets;

    const updatedBankroll =
      totalPayout > 0
        ? await tx.bankroll.update({
            where: { id: 1 },
            data: { amount: { increment: totalPayout } },
          })
        : await tx.bankroll.findUnique({ where: { id: 1 } });

    return {
      updatedMatch,
      openBetsCount: openBets.length,
      openLegsCount: openLegs.length,
      ticketsTouched: affectedTicketIds.length,
      ticketsSettledCount,
      totalPayoutFromBets,
      totalPayoutFromTickets,
      totalPayout,
      updatedBankrollAmount: updatedBankroll?.amount ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    match: settled.updatedMatch,
    resultPick,
    openBetsSettled: settled.openBetsCount,
    openTicketLegsSettled: settled.openLegsCount,
    ticketsTouched: settled.ticketsTouched,
    ticketsSettled: settled.ticketsSettledCount,
    totalPayoutFromBets: settled.totalPayoutFromBets,
    totalPayoutFromTickets: settled.totalPayoutFromTickets,
    totalPayout: settled.totalPayout,
    bankroll: settled.updatedBankrollAmount,
  });
}