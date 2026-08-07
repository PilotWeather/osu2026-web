-- AlterTable
ALTER TABLE "Personnel" ADD COLUMN     "isActiveFlying" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Personnel_isActiveFlying_idx" ON "Personnel"("isActiveFlying");
