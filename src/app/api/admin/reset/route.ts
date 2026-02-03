import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function todayISODate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST() {
  const slateDate = todayISODate();

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
      update: { amount: 1000 },
      create: { id: 1, amount: 1000 },
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

    return { slateDate, matches: games.length, bankroll: 1000 };
  });

  return NextResponse.json({ ok: true, ...result });
}