import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utcTodayISODate } from "@/lib/betting";

export async function GET() {
  const slateDate = utcTodayISODate();
  const matches = await prisma.match.findMany({
    where: { slateDate },
    orderBy: { commenceTimeUTC: "asc" },
  });

  return NextResponse.json({ slateDate, matches });
}