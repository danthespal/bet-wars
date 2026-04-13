import { prisma } from "@/lib/prisma";
import { DEFAULT_BANKROLL_CENTS, resetMockBankrolls } from "@/lib/mock-users";
import { utcTodayISODate } from "@/lib/betting";

type Pick = "1" | "X" | "2";

function outcomeFromScore(home: number, away: number): Pick {
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

function randomScore() {
  return {
    home: Math.floor(Math.random() * 4),
    away: Math.floor(Math.random() * 4),
  };
}

export async function resetMockSlate() {
  const slateDate = utcTodayISODate();
  const games: [string, string][] = [
    ["Portsmouth", "Bolton"],
    ["Derby", "Barnsley"],
    ["Reading", "Wycombe"],
    ["Blackpool", "Lincoln"],
    ["Charlton", "Exeter"],
    ["Wigan", "Fleetwood"],
    ["Peterborough", "Cambridge"],
    ["Leyton Orient", "Shrewsbury"],
  ];

  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);

  return prisma.$transaction(async (tx) => {
    await tx.ticketLeg.deleteMany();
    await tx.ticket.deleteMany();
    await tx.match.deleteMany();
    await resetMockBankrolls(tx, DEFAULT_BANKROLL_CENTS);

    for (let i = 0; i < games.length; i++) {
      const kickoff = new Date(base);
      kickoff.setUTCHours(base.getUTCHours() + i);

      await tx.match.create({
        data: {
          slateDate,
          league: "soccer_england_league1",
          commenceTimeUTC: kickoff.toISOString(),
          homeTeam: games[i][0],
          awayTeam: games[i][1],
          oddsHome: 1.75 + (i % 3) * 0.15,
          oddsDraw: 3.3 + (i % 2) * 0.1,
          oddsAway: 4.2 + (i % 4) * 0.25,
          status: "scheduled",
        },
      });
    }

    return {
      slateDate,
      matches: games.length,
      bankrollCents: DEFAULT_BANKROLL_CENTS,
    };
  });
}

export async function settleRandomMatch(adminUserId: number) {
  const scheduled = await prisma.match.findMany({
    where: { status: "scheduled" },
    orderBy: { id: "asc" },
  });

  if (scheduled.length === 0) {
    return { ok: true as const, message: "No scheduled matches left to settle." };
  }

  const match = scheduled[Math.floor(Math.random() * scheduled.length)];
  const score = randomScore();
  const resultPick = outcomeFromScore(score.home, score.away);

  const settled = await prisma.$transaction(async (tx) => {
    const updatedMatch = await tx.match.update({
      where: { id: match.id },
      data: {
        status: "finished",
        scoreHome: score.home,
        scoreAway: score.away,
      },
    });

    const legs = await tx.ticketLeg.findMany({
      where: { matchId: match.id, status: "open" },
    });

    const affectedTicketIds = new Set<number>();

    for (const leg of legs) {
      affectedTicketIds.add(leg.ticketId);
      await tx.ticketLeg.update({
        where: { id: leg.id },
        data: {
          status: leg.pick === resultPick ? "won" : "lost",
          settledAt: new Date(),
        },
      });
    }

    let ticketsSettled = 0;
    let totalPayoutCents = 0;

    for (const ticketId of affectedTicketIds) {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { legs: true },
      });

      if (!ticket || ticket.status !== "open") continue;
      if (ticket.legs.some((leg) => leg.status === "open")) continue;

      const anyLost = ticket.legs.some((leg) => leg.status === "lost");
      const effectiveOdds = ticket.legs.reduce((total, leg) => {
        if (leg.status === "void" || leg.status === "push") return total;
        return total * leg.oddsUsed;
      }, 1);
      const payoutCents = anyLost ? 0 : Math.round(ticket.stakeCents * effectiveOdds);

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: "settled",
          payoutCents,
          settledAt: new Date(),
          totalOdds: effectiveOdds,
        },
      });

      if (payoutCents > 0) {
        await tx.bankroll.update({
          where: { userId: ticket.userId },
          data: { amountCents: { increment: payoutCents } },
        });
      }

      ticketsSettled += 1;
      totalPayoutCents += payoutCents;
    }

    const bankroll = await tx.bankroll.findUnique({ where: { userId: adminUserId } });

    return {
      updatedMatch,
      resultPick,
      legsSettled: legs.length,
      ticketsSettled,
      totalPayoutCents,
      bankrollCents: bankroll?.amountCents ?? 0,
    };
  });

  return { ok: true as const, ...settled };
}
