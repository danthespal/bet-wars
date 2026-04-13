import { NextResponse } from "next/server";
import { getSessionFromRequest, type SessionUser } from "@/features/auth/server/session";

export type UserGuardResult =
  | { ok: true; session: SessionUser }
  | { ok: false; response: NextResponse };

export function requireUser(req: Request): UserGuardResult {
  const session = getSessionFromRequest(req);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 }),
    };
  }

  return { ok: true, session };
}
