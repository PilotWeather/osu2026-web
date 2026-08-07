-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PARSED', 'REVIEW_REQUIRED', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('READY', 'REVIEW', 'INVALID', 'IMPORTED', 'DUPLICATE');

-- CreateTable
CREATE TABLE "Aircraft" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "aircraftType" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "flightDate" TIMESTAMP(3),
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "warningRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedInstructor" TEXT,
    "instructorId" TEXT,
    "warning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "flightDate" TIMESTAMP(3) NOT NULL,
    "sourceSortieNo" TEXT,
    "sourceFlightType" TEXT,
    "aircraftId" TEXT NOT NULL,
    "instructorId" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "departureAirport" TEXT,
    "arrivalAirport" TEXT,
    "takeoffTime" TIMESTAMP(3),
    "landingTime" TIMESTAMP(3),
    "airborneDurationMinutes" INTEGER,
    "groundDurationMinutes" INTEGER,
    "sortieDurationMinutes" INTEGER,
    "flightRules" TEXT,
    "runway" TEXT,
    "frequency" TEXT,
    "remarks" TEXT,
    "importBatchId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Aircraft_registration_key" ON "Aircraft"("registration");

-- CreateIndex
CREATE INDEX "Aircraft_active_idx" ON "Aircraft"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Student_normalizedName_key" ON "Student"("normalizedName");

-- CreateIndex
CREATE INDEX "ImportBatch_fileHash_status_idx" ON "ImportBatch"("fileHash", "status");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ImportBatch_flightDate_idx" ON "ImportBatch"("flightDate");

-- CreateIndex
CREATE INDEX "ImportBatch_uploadedByUserId_idx" ON "ImportBatch"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "ImportRow_importBatchId_status_idx" ON "ImportRow"("importBatchId", "status");

-- CreateIndex
CREATE INDEX "ImportRow_instructorId_idx" ON "ImportRow"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_importBatchId_rowNumber_key" ON "ImportRow"("importBatchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Flight_signature_key" ON "Flight"("signature");

-- CreateIndex
CREATE INDEX "Flight_flightDate_idx" ON "Flight"("flightDate");

-- CreateIndex
CREATE INDEX "Flight_aircraftId_idx" ON "Flight"("aircraftId");

-- CreateIndex
CREATE INDEX "Flight_instructorId_idx" ON "Flight"("instructorId");

-- CreateIndex
CREATE INDEX "Flight_studentId_idx" ON "Flight"("studentId");

-- CreateIndex
CREATE INDEX "Flight_importBatchId_idx" ON "Flight"("importBatchId");

-- CreateIndex
CREATE INDEX "Flight_takeoffTime_idx" ON "Flight"("takeoffTime");

-- CreateIndex
CREATE INDEX "Flight_landingTime_idx" ON "Flight"("landingTime");

-- CreateIndex
CREATE INDEX "Flight_archivedAt_idx" ON "Flight"("archivedAt");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flight" ADD CONSTRAINT "Flight_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
