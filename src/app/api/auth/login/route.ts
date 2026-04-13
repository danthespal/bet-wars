import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoginSchema } from "@/features/auth/server/schemas";
import { verifyPassword } from "@/features/auth/server/password";
import { setSessionCookie } from "@/features/auth/server/session";

function invalidRequest(details: unknown) {
  return NextResponse.json({ ok: false, error: "Invalid request", details }, { status: 400 });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidRequest("Invalid JSON body");
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    return invalidRequest(details);
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });

  setSessionCookie(response, {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return response;
}
