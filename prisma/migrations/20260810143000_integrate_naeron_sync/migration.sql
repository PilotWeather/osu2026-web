-- CreateEnum
CREATE TYPE "NaeronSyncMode" AS ENUM ('FULL', 'INCREMENTAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FlightStatus" ADD VALUE 'INCOMPLETE';
ALTER TYPE "FlightStatus" ADD VALUE 'UNKNOWN';

-- DropForeignKey
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_aircraftId_fkey";

-- DropForeignKey
ALTER TABLE "Flight" DROP CONSTRAINT "Flight_importBatchId_fkey";

-- AlterTable
ALTER TABLE "Aircraft" ADD COLUMN     "currentTach" DECIMAL(12,2),
ADD COLUMN     "lastBase" TEXT,
ADD COLUMN     "lastFlightDate" TIMESTAMP(3),
ADD COLUMN     "naeronAircraftId" TEXT,
ADD COLUMN     "naeronPayload" JSONB,
ADD COLUMN     "naeronVmId" TEXT,
ADD COLUMN     "ueggs" TIMESTAMP(3),
ADD COLUMN     "underMaintenance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "upstreamUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "endingTach" DECIMAL(12,2),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalPlanId" TEXT,
ADD COLUMN     "faultDescription" TEXT,
ADD COLUMN     "faultState" TEXT,
ADD COLUMN     "hasFault" BOOLEAN,
ADD COLUMN     "landingCount" INTEGER,
ADD COLUMN     "landingDate" TIMESTAMP(3),
ADD COLUMN     "naeronPayload" JSONB,
ADD COLUMN     "observerPersonnelId" TEXT,
ADD COLUMN     "offBlockTime" TIMESTAMP(3),
ADD COLUMN     "onBlockTime" TIMESTAMP(3),
ADD COLUMN     "route" TEXT,
ADD COLUMN     "secondStudentId" TEXT,
ADD COLUMN     "upstreamCanceled" INTEGER,
ADD COLUMN     "upstreamIncomplete" INTEGER,
ADD COLUMN     "upstreamRealized" INTEGER,
ADD COLUMN     "upstreamStatus" TEXT,
ADD COLUMN     "upstreamUpdatedAt" TIMESTAMP(3),
ALTER COLUMN "aircraftId" DROP NOT NULL,
ALTER COLUMN "importBatchId" DROP NOT NULL;

-- Backfill stable identifiers for existing PDF-imported flights before enforcing NOT NULL.
UPDATE "Flight" SET "externalId" = 'pdf:' || "signature" WHERE "externalId" IS NULL;
ALTER TABLE "Flight" ALTER COLUMN "externalId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Personnel" ADD COLUMN     "naeronEmployeeId" TEXT,
ADD COLUMN     "naeronVmId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "naeronPersonId" TEXT,
ADD COLUMN     "naeronVmId" TEXT;

-- CreateTable
CREATE TABLE "NaeronSyncState" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "snapshotCursor" TEXT,
    "changesCursor" TEXT,
    "deletedCursor" TEXT,
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFullSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NaeronSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NaeronSyncBatch" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "mode" "NaeronSyncMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "archived" INTEGER NOT NULL DEFAULT 0,
    "completedFlights" INTEGER NOT NULL DEFAULT 0,
    "cancelledFlights" INTEGER NOT NULL DEFAULT 0,
    "unmatchedInstructors" INTEGER NOT NULL DEFAULT 0,
    "unmatchedStudents" INTEGER NOT NULL DEFAULT 0,
    "aircraftUpdated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,

    CONSTRAINT "NaeronSyncBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NaeronSyncState_tableName_key" ON "NaeronSyncState"("tableName");

-- CreateIndex
CREATE INDEX "NaeronSyncBatch_tableName_startedAt_idx" ON "NaeronSyncBatch"("tableName", "startedAt");

-- CreateIndex
CREATE INDEX "NaeronSyncBatch_success_startedAt_idx" ON "NaeronSyncBatch"("success", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_naeronAircraftId_key" ON "Aircraft"("naeronAircraftId");

-- CreateIndex
CREATE INDEX "Aircraft_naeronVmId_idx" ON "Aircraft"("naeronVmId");

-- CreateIndex
CREATE INDEX "Aircraft_underMaintenance_idx" ON "Aircraft"("underMaintenance");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_externalId_key" ON "Flight"("externalId");

-- CreateIndex
CREATE INDEX "Flight_secondStudentId_idx" ON "Flight"("secondStudentId");

-- CreateIndex
CREATE INDEX "Flight_observerPersonnelId_idx" ON "Flight"("observerPersonnelId");

-- CreateIndex
CREATE INDEX "Flight_upstreamUpdatedAt_idx" ON "Flight"("upstreamUpdatedAt");

-- CreateIndex
CREATE INDEX "Flight_archived_idx" ON "Flight"("archived");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_naeronEmployeeId_key" ON "Personnel"("naeronEmployeeId");

-- CreateIndex
CREATE INDEX "Personnel_naeronVmId_idx" ON "Personnel"("naeronVmId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_naeronPersonId_key" ON "Student"("naeronPersonId");

-- CreateIndex
CREATE INDEX "Student_naeronVmId_idx" ON "Student"("naeronVmId");

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_observerPersonnelId_fkey" FOREIGN KEY ("observerPersonnelId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_secondStudentId_fkey" FOREIGN KEY ("secondStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
