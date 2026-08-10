ALTER TABLE "Personnel"
ADD COLUMN "canonicalFullName" TEXT;

ALTER TABLE "NaeronSyncState"
ADD COLUMN "syncLockToken" TEXT,
ADD COLUMN "syncLockedAt" TIMESTAMP(3),
ADD COLUMN "syncLockedByEmail" TEXT;

ALTER TABLE "NaeronSyncBatch"
ADD COLUMN "triggeredByEmail" TEXT;

CREATE INDEX "Personnel_canonicalFullName_idx" ON "Personnel"("canonicalFullName");
CREATE INDEX "NaeronSyncState_syncLockedAt_idx" ON "NaeronSyncState"("syncLockedAt");
CREATE INDEX "NaeronSyncBatch_triggeredByEmail_startedAt_idx" ON "NaeronSyncBatch"("triggeredByEmail", "startedAt");
