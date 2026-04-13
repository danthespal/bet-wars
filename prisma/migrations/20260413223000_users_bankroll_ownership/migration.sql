PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

INSERT OR IGNORE INTO "User" ("email", "passwordHash", "role", "createdAt", "updatedAt")
VALUES
    ('admin@betwars.local', 'seed:admin', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('player@betwars.local', 'seed:player', 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "new_Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "stakeCents" INTEGER NOT NULL,
    "payoutCents" INTEGER,
    "totalOdds" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Ticket" ("id", "userId", "stakeCents", "payoutCents", "totalOdds", "status", "placedAt", "settledAt")
SELECT
    "id",
    (SELECT "id" FROM "User" WHERE "email" = 'player@betwars.local' LIMIT 1),
    "stakeCents",
    "payoutCents",
    "totalOdds",
    "status",
    "placedAt",
    "settledAt"
FROM "Ticket";

DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";

CREATE TABLE "new_Bankroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 100000,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bankroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Bankroll_userId_key" ON "new_Bankroll"("userId");

INSERT INTO "new_Bankroll" ("userId", "amountCents", "updatedAt")
SELECT
    (SELECT "id" FROM "User" WHERE "email" = 'player@betwars.local' LIMIT 1),
    "amountCents",
    "updatedAt"
FROM "Bankroll"
LIMIT 1;

INSERT OR IGNORE INTO "new_Bankroll" ("userId", "amountCents", "updatedAt")
SELECT
    "id",
    100000,
    CURRENT_TIMESTAMP
FROM "User";

DROP TABLE "Bankroll";
ALTER TABLE "new_Bankroll" RENAME TO "Bankroll";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
