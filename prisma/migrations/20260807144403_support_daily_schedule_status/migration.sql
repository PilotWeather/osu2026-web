-- CreateEnum
CREATE TYPE "FlightStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ImportRowStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Flight" ADD COLUMN     "sourceFlightCode" TEXT,
ADD COLUMN     "sourceTeam" TEXT,
ADD COLUMN     "status" "FlightStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "trainingTask" TEXT;

-- AlterTable
ALTER TABLE "ImportBatch" ADD COLUMN     "cancelledRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completedRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceRows" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validationDurationMinutes" INTEGER,
ADD COLUMN     "validationPassed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Flight_status_flightDate_idx" ON "Flight"("status", "flightDate");

-- CreateIndex
CREATE INDEX "Flight_sourceTeam_flightDate_idx" ON "Flight"("sourceTeam", "flightDate");
