import { NextResponse } from "next/server";
import { getTodayMatches } from "@/features/matches/server/service";
import { requireUser } from "@/features/auth/server/require-user";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const { slateDate, matches } = await getTodayMatches();

  return NextResponse.json({ slateDate, matches });
}
