import { createHash } from "node:crypto";
import type { Prisma, PrismaClient, User } from "@prisma/client";

const DEFAULT_BANKROLL_CENTS = 100000;
const DEFAULT_ADMIN_EMAIL = "admin@betwars.local";
const DEFAULT_DEMO_EMAIL = "player@betwars.local";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_DEMO_PASSWORD = "player123";

type DbClient = PrismaClient | Prisma.TransactionClient;

function seededPasswordHash(password: string) {
  return `seed:${createHash("sha256").update(password).digest("hex")}`;
}

function getAdminSeed() {
  return {
    email: process.env.ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL,
    passwordHash: seededPasswordHash(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD),
  };
}

function getDemoSeed() {
  return {
    email: process.env.DEMO_USER_EMAIL?.trim().toLowerCase() || DEFAULT_DEMO_EMAIL,
    passwordHash: seededPasswordHash(process.env.DEMO_USER_PASSWORD || DEFAULT_DEMO_PASSWORD),
  };
}

async function upsertUserWithBankroll(
  db: DbClient,
  input: { email: string; passwordHash: string; role: "admin" | "user" }
): Promise<User> {
  const user = await db.user.upsert({
    where: { email: input.email },
    update: {
      role: input.role,
      passwordHash: input.passwordHash,
    },
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
    },
  });

  await db.bankroll.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      amountCents: DEFAULT_BANKROLL_CENTS,
    },
  });

  return user;
}

export async function ensureMockUsers(db: DbClient) {
  const adminSeed = getAdminSeed();
  const demoSeed = getDemoSeed();

  const adminUser = await upsertUserWithBankroll(db, {
    email: adminSeed.email,
    passwordHash: adminSeed.passwordHash,
    role: "admin",
  });

  const demoUser = await upsertUserWithBankroll(db, {
    email: demoSeed.email,
    passwordHash: demoSeed.passwordHash,
    role: "user",
  });

  return { adminUser, demoUser };
}

export async function ensureDemoUser(db: DbClient) {
  const { demoUser } = await ensureMockUsers(db);
  return demoUser;
}

export async function resetMockBankrolls(db: DbClient, amountCents = DEFAULT_BANKROLL_CENTS) {
  const { adminUser, demoUser } = await ensureMockUsers(db);

  await db.bankroll.updateMany({
    where: { userId: { in: [adminUser.id, demoUser.id] } },
    data: { amountCents },
  });

  return { adminUser, demoUser, amountCents };
}

export { DEFAULT_BANKROLL_CENTS };
