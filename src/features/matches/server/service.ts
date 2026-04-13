import { prisma } from "@/lib/prisma";
import { utcTodayISODate } from "@/lib/betting";

export async function getTodayMatches() {
  const slateDate = utcTodayISODate();
  const matches = await prisma.match.findMany({
    where: { slateDate },
    orderBy: { commenceTimeUTC: "asc" },
  });

  return { slateDate, matches };
}
