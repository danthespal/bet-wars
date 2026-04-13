import { NextResponse } from "next/server";
import { getUserBankroll } from "@/features/bankroll/server/service";
import { requireUser } from "@/features/auth/server/require-user";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const b = await getUserBankroll(auth.session.userId);
  return NextResponse.json({ amountCents: b?.amountCents ?? 0 });
}
