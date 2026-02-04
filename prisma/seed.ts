import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL!,
  }),
});

function todayISODate() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const slateDate = todayISODate();

  // clean start (delete children first)
  await prisma.ticketLeg.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.match.deleteMany();

  // reset bankroll singleton
  await prisma.bankroll.upsert({
    where: { id: 1 },
    update: { amountCents: 100000 },
    create: { id: 1, amountCents: 100000 },
  });

  // mock matches (8) + frozen odds
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);

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

  for (let i = 0; i < games.length; i++) {
    const kickoff = new Date(base);
    kickoff.setUTCHours(base.getUTCHours() + i);

    // plausible odds
    const home = 1.75 + (i % 3) * 0.15;
    const draw = 3.30 + (i % 2) * 0.10;
    const away = 4.20 + (i % 4) * 0.25;

    await prisma.match.create({
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

  console.log(`✅ Seeded ${games.length} matches for ${slateDate}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
