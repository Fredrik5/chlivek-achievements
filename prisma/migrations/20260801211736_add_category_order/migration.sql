-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Category" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: number categories 0, 1, 2, ... by their existing createdAt so
-- this is a no-op for today's visible order.
UPDATE "Category"
SET "order" = (
  SELECT COUNT(*)
  FROM "Category" AS c2
  WHERE (
    c2."createdAt" < "Category"."createdAt"
    OR (c2."createdAt" = "Category"."createdAt" AND c2."id" < "Category"."id")
  )
);
