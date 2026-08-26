-- Create Category table first
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Backfill: one Category row per distinct (user, type, old-label)
INSERT INTO "Category" ("id", "name", "type", "userId")
SELECT DISTINCT
    md5(t."userId" || ':' || t."type" || ':' || t."category"),
    t."category",
    t."type",
    t."userId"
FROM "Transaction" t;

-- Add FK column as nullable so existing rows stay valid during backfill
ALTER TABLE "Transaction" ADD COLUMN "categoryId" TEXT;

-- Point every transaction at its matching category
UPDATE "Transaction" t
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."userId" = t."userId"
  AND c."name" = t."category"
  AND c."type" = t."type";

-- Now that no rows are null, enforce the required relation
ALTER TABLE "Transaction" ALTER COLUMN "categoryId" SET NOT NULL;

-- Safe to drop the old free-text column; data now lives in Category
ALTER TABLE "Transaction" DROP COLUMN "category";

-- Date-only semantics (UTC calendar days, kills TZ off-by-one debt)
ALTER TABLE "Transaction" ALTER COLUMN "date" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "date" SET DATA TYPE DATE;

CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
