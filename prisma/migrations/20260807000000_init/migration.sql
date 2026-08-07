-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('SEP', 'SEP_FI', 'CLASS_1');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceSequence" INTEGER,
    "nationalId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "tshirtSize" TEXT,
    "licenseNo" TEXT,
    "notes" TEXT,
    "companyId" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_sourceKey_key" ON "Personnel"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_nationalId_key" ON "Personnel"("nationalId");

-- CreateIndex
CREATE INDEX "Personnel_companyId_idx" ON "Personnel"("companyId");

-- CreateIndex
CREATE INDEX "Personnel_teamId_idx" ON "Personnel"("teamId");

-- CreateIndex
CREATE INDEX "Personnel_licenseNo_idx" ON "Personnel"("licenseNo");

-- CreateIndex
CREATE INDEX "Vehicle_personnelId_active_idx" ON "Vehicle"("personnelId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_personnelId_plate_key" ON "Vehicle"("personnelId", "plate");

-- CreateIndex
CREATE INDEX "Credential_type_expiryDate_idx" ON "Credential"("type", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_personnelId_type_key" ON "Credential"("personnelId", "type");

-- AddForeignKey
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
