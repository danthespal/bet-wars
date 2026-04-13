import { NextResponse } from "next/server";
import { settleRandomMatch } from "@/features/admin/server/service";
import { requireAdmin } from "@/features/auth/server/require-admin";

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const settled = await settleRandomMatch(auth.session.userId);

  return NextResponse.json({
    ...settled,
    match: "updatedMatch" in settled ? settled.updatedMatch : undefined,
  });
}
