import { NextResponse } from "next/server";
import { getSessionFromCookieHeader } from "@/features/auth/server/session";

export async function GET(req: Request) {
  const session = getSessionFromCookieHeader(req.headers.get("cookie"));

  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
  });
}
