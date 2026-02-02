-- CreateTable
CREATE TABLE "Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stake" REAL NOT NULL,
    "totalOdds" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "payout" REAL,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME
);

-- CreateTable
CREATE TABLE "TicketLeg" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "pick" TEXT NOT NULL,
    "oddsUsed" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "settledAt" DATETIME,
    CONSTRAINT "TicketLeg_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketLeg_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bankroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" REAL NOT NULL DEFAULT 1000,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bankroll" ("amount", "id", "updatedAt") SELECT "amount", "id", "updatedAt" FROM "Bankroll";
DROP TABLE "Bankroll";
ALTER TABLE "new_Bankroll" RENAME TO "Bankroll";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TicketLeg_ticketId_matchId_key" ON "TicketLeg"("ticketId", "matchId");
