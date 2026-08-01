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
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iconPath" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Achievement" ("categoryId", "createdAt", "description", "iconPath", "id", "isActive", "isSecret", "points", "requiresApproval", "title") SELECT "categoryId", "createdAt", "description", "iconPath", "id", "isActive", "isSecret", "points", "requiresApproval", "title" FROM "Achievement";
DROP TABLE "Achievement";
ALTER TABLE "new_Achievement" RENAME TO "Achievement";
CREATE INDEX "Achievement_categoryId_idx" ON "Achievement"("categoryId");
CREATE INDEX "Achievement_isSecret_idx" ON "Achievement"("isSecret");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: number achievements 0, 1, 2, ... within each category (NULL
-- categoryId group = all secret achievements together), ordered by their
-- existing createdAt so this is a no-op for today's visible order.
UPDATE "Achievement"
SET "order" = (
  SELECT COUNT(*)
  FROM "Achievement" AS a2
  WHERE a2."categoryId" IS "Achievement"."categoryId"
    AND (
      a2."createdAt" < "Achievement"."createdAt"
      OR (a2."createdAt" = "Achievement"."createdAt" AND a2."id" < "Achievement"."id")
    )
);
