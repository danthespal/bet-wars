import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/features/auth/server/password";
import { RegisterSchema } from "@/features/auth/server/schemas";
import { setSessionCookie } from "@/features/auth/server/session";
import { DEFAULT_BANKROLL_CENTS } from "@/lib/mock-users";

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

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    return invalidRequest(details);
  }

  const { email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ ok: false, error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "user",
      },
    });

    await tx.bankroll.create({
      data: {
        userId: createdUser.id,
        amountCents: DEFAULT_BANKROLL_CENTS,
      },
    });

    return createdUser;
  });

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
