import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utcTodayISODate } from "@/lib/betting";

export async function POST() {
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

  const result = await prisma.$transaction(async (tx) => {
    await tx.ticketLeg.deleteMany();
    await tx.ticket.deleteMany();

    await tx.match.deleteMany();

    // reset bankroll singleton
    await tx.bankroll.upsert({
      where: { id: 1 },
      update: { amountCents: 100000 },
      create: { id: 1, amountCents: 100000 },
    });

    // reseed matches
    for (let i = 0; i < games.length; i++) {
      const kickoff = new Date(base);
      kickoff.setUTCHours(base.getUTCHours() + i);

      const home = 1.75 + (i % 3) * 0.15;
      const draw = 3.30 + (i % 2) * 0.10;
      const away = 4.20 + (i % 4) * 0.25;

      await tx.match.create({
        data: {
          slateDate,
          league: "soccer_england_league1",
          commenceTimeUTC: kickoff.toISOString(),
          homeTeam: games[i][0],
          awayTeam: games[i][1],
          oddsHome: home,
          oddsDraw: draw,
          oddsAway: away,
          status: "scheduled",
        },
      });
    }

    return { slateDate, matches: games.length, bankrollCents: 100000 };
  });

  return NextResponse.json({ ok: true, ...result });
}