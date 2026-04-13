import { NextResponse } from "next/server";
import { requireUser } from "@/features/auth/server/require-user";
import type { SessionUser } from "@/features/auth/server/session";

export type AdminGuardResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export function requireAdmin(req: Request): AdminGuardResult {
  const userGuard = requireUser(req);
  if (!userGuard.ok) return userGuard;

  if (userGuard.session.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 }),
    };
  }

  return { ok: true, session: userGuard.session };
}
