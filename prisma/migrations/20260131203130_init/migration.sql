-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slateDate" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "commenceTimeUTC" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "oddsHome" REAL NOT NULL,
    "oddsDraw" REAL NOT NULL,
    "oddsAway" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scoreHome" INTEGER,
    "scoreAway" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "pick" TEXT NOT NULL,
    "stake" REAL NOT NULL,
    "oddsUsed" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "payout" REAL,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" DATETIME,
    CONSTRAINT "Bet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bankroll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "amount" REAL NOT NULL DEFAULT 1000,
    "updatedAt" DATETIME NOT NULL
);
