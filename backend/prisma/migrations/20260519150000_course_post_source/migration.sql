-- CreateEnum
CREATE TYPE "CoursePostSource" AS ENUM ('MANUAL', 'SESSION', 'ATTENDANCE', 'DEAN', 'REGISTRATION');

-- AlterTable
ALTER TABLE "CoursePost"
  ADD COLUMN "source" "CoursePostSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "sourceKey" TEXT;

-- CreateIndex: idempotency anchor for auto-posts (NULLs not deduped, so MANUAL
-- posts stay free of conflicts).
CREATE UNIQUE INDEX "CoursePost_courseOfferingId_source_sourceKey_key"
  ON "CoursePost"("courseOfferingId", "source", "sourceKey");
