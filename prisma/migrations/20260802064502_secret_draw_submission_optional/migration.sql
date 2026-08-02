-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SecretDraw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "achievementId" TEXT NOT NULL,
    "submissionId" TEXT,
    "drawnAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecretDraw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SecretDraw_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SecretDraw_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SecretDraw" ("achievementId", "drawnAt", "id", "submissionId", "threshold", "userId") SELECT "achievementId", "drawnAt", "id", "submissionId", "threshold", "userId" FROM "SecretDraw";
DROP TABLE "SecretDraw";
ALTER TABLE "new_SecretDraw" RENAME TO "SecretDraw";
CREATE UNIQUE INDEX "SecretDraw_submissionId_key" ON "SecretDraw"("submissionId");
CREATE UNIQUE INDEX "SecretDraw_userId_threshold_key" ON "SecretDraw"("userId", "threshold");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
