import { NextResponse } from "next/server";
import { resetMockSlate } from "@/features/admin/server/service";
import { requireAdmin } from "@/features/auth/server/require-admin";

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const result = await resetMockSlate();

  return NextResponse.json({ ok: true, ...result });
}
