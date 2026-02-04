import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const b = await prisma.bankroll.findUnique({ where: { id: 1 } });
  return NextResponse.json({ amountCents: b?.amountCents ?? 0 });
}