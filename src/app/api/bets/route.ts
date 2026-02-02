import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const bets = await prisma.bet.findMany({
        orderBy: { placedAt: "desc" },
        include: {
            match: {
                select: { homeTeam: true, awayTeam: true, slateDate: true },
            },
        },
    });

    return NextResponse.json({ bets });
}