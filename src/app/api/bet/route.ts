import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Pick = "1" | "X" | "2";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    const matchId = Number(body?.matchId);
    const pick = body?.pick as Pick;
    const stake = Number(body?.stake);

    if (!Number.isInteger(matchId) || matchId <= 0) {
        return NextResponse.json({ ok: false, error: "Invalid matchId" }, { status: 400 });
    }
    if (!["1", "X", "2"].includes(pick)) {
        return NextResponse.json({ ok: false, error: "Invalid pick" }, { status: 400 });
    }
    if (!Number.isFinite(stake) || stake <= 0) {
        return NextResponse.json({ ok: false, error: "Invalid stake" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ ok: false, error: "Match not found" }, { status: 400 });

    // Lock bets after kickoff (simple UTC check)
    if (new Date() >= new Date(match.commenceTimeUTC)) {
        return NextResponse.json({ ok: false, error: "Betting closed (match started)" }, { status: 400 });
    }

    const bankroll = await prisma.bankroll.findUnique({ where: { id: 1 } });
    const amount = bankroll?.amount ?? 0;

    if (stake > amount) {
        return NextResponse.json({ ok: false, error: "Insufficient bankroll "}, { status: 400 });
    }

    const oddsUsed =
        pick === "1" ? match.oddsHome :
        pick === "X" ? match.oddsDraw :
        match.oddsAway;

    // Transaction: substract bankroll + create bet
    const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.bankroll.update({
            where: { id: 1},
            data: { amount: { decrement: stake } },
        });

        const bet = await tx.bet.create({
            data: {
                matchId,
                pick,
                stake,
                oddsUsed,
                status: "open",
            },
        });

        return { updated, bet };
    });

    return NextResponse.json({ ok: true, bankroll: result.updated.amount, bet: result.bet });
}