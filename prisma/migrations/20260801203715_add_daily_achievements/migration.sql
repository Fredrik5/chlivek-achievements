-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Achievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "categoryId" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "isDaily" BOOLEAN NOT NULL DEFAULT false,
    "dailyDate" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iconPath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Achievement" ("categoryId", "createdAt", "description", "iconPath", "id", "isActive", "isSecret", "order", "points", "requiresApproval", "title") SELECT "categoryId", "createdAt", "description", "iconPath", "id", "isActive", "isSecret", "order", "points", "requiresApproval", "title" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE UNIQUE INDEX "Achievement_dailyDate_key" ON "Achievement"("dailyDate");
CREATE INDEX "Achievement_categoryId_idx" ON "Achievement"("categoryId");
CREATE INDEX "Achievement_isSecret_idx" ON "Achievement"("isSecret");
CREATE INDEX "Achievement_isDaily_idx" ON "Achievement"("isDaily");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
