/*
  Warnings:

  - You are about to drop the column `amount` on the `Bankroll` table. All the data in the column will be lost.
  - You are about to drop the column `payout` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `stake` on the `Ticket` table. All the data in the column will be lost.
  - Added the required column `stakeCents` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bankroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amountCents" INTEGER NOT NULL DEFAULT 100000,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Bankroll" ("id", "updatedAt") SELECT "id", "updatedAt" FROM "Bankroll";
DROP TABLE "Bankroll";
ALTER TABLE "new_Bankroll" RENAME TO "Bankroll";
CREATE TABLE "new_Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stakeCents" INTEGER NOT NULL,
    "payoutCents" INTEGER,
    "totalOdds" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME
);
INSERT INTO "new_Ticket" ("id", "placedAt", "settledAt", "status", "totalOdds") SELECT "id", "placedAt", "settledAt", "status", "totalOdds" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
