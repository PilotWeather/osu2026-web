-- CreateTable
CREATE TABLE "PersonnelAlias" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelAlias_personnelId_normalizedAlias_key" ON "PersonnelAlias"("personnelId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "PersonnelAlias_normalizedAlias_idx" ON "PersonnelAlias"("normalizedAlias");

-- AddForeignKey
ALTER TABLE "PersonnelAlias" ADD CONSTRAINT "PersonnelAlias_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
