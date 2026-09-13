-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'GRADUATED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable Batch
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "graduatedAt" TIMESTAMP(3);
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "graduationAcademicYearId" INTEGER;

-- AlterTable StudentRegistration
ALTER TABLE "StudentRegistration" ADD COLUMN IF NOT EXISTS "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "StudentRegistration" ADD COLUMN IF NOT EXISTS "graduatedAt" TIMESTAMP(3);
ALTER TABLE "StudentRegistration" ADD COLUMN IF NOT EXISTS "graduationAcademicYearId" INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS "Batch_status_idx" ON "Batch"("status");
CREATE INDEX IF NOT EXISTS "Batch_graduationAcademicYearId_idx" ON "Batch"("graduationAcademicYearId");
CREATE INDEX IF NOT EXISTS "StudentRegistration_status_idx" ON "StudentRegistration"("status");
CREATE INDEX IF NOT EXISTS "StudentRegistration_graduationAcademicYearId_idx" ON "StudentRegistration"("graduationAcademicYearId");

-- FKs
DO $$ BEGIN
  ALTER TABLE "Batch"
    ADD CONSTRAINT "Batch_graduationAcademicYearId_fkey"
    FOREIGN KEY ("graduationAcademicYearId") REFERENCES "AcademicYear"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StudentRegistration"
    ADD CONSTRAINT "StudentRegistration_graduationAcademicYearId_fkey"
    FOREIGN KEY ("graduationAcademicYearId") REFERENCES "AcademicYear"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
