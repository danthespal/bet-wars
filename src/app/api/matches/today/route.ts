import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function todayISODate() {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export async function GET() {
    const slateDate = todayISODate();
    const matches = await prisma.match.findMany({
        where: { slateDate },
        orderBy: { commenceTimeUTC: "asc" },
    });

    return NextResponse.json({ slateDate, matches });
}