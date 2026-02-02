import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function todayISODate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
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

    await prisma.$transaction(async (tx) => {
        // IMPORTANT: delete children first (legs), then tickets
        await tx.ticketLeg.deleteMany();
        await tx.ticket.deleteMany();
            
        // if you still keep singles
        await tx.bet.deleteMany();
            
        // now safe to delete matches
        await tx.match.deleteMany();
            
        // reset bankroll
        await tx.bankroll.upsert({
          where: { id: 1 },
          update: { amount: 1000 },
          create: { id: 1, amount: 1000 },
        });
    
        // re-seed matches
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
    });


    return NextResponse.json({ ok: true, slateDate, matches: games.length, bankroll: 1000 });
}