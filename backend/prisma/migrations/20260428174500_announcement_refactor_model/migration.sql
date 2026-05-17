-- Refactor Announcement: bridge historical columns to current Prisma model.
-- Historical (after 20260422044645): authorId, created_at, updated_at, attachments,
-- status enum, target* arrays, etc. Target: createdById, createdAt, updatedAt, imageUrls,
-- priority/targetType text, hierarchy FKs, isPinned/isActive.

-- Prisma field names (no @map on Announcement)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'authorId'
  ) THEN
    ALTER TABLE "Announcement" RENAME COLUMN "authorId" TO "createdById";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "Announcement" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "Announcement" RENAME COLUMN "updated_at" TO "updatedAt";
  END IF;
END $$;

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdByRole" TEXT NOT NULL DEFAULT 'FACULTY';

-- imageUrls from attachments or new empty array
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'attachments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'imageUrls'
  ) THEN
    ALTER TABLE "Announcement" RENAME COLUMN "attachments" TO "imageUrls";
  END IF;
END $$;

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Announcement" SET "imageUrls" = COALESCE("imageUrls", ARRAY[]::TEXT[]) WHERE "imageUrls" IS NULL;
ALTER TABLE "Announcement" ALTER COLUMN "imageUrls" SET NOT NULL;
ALTER TABLE "Announcement" ALTER COLUMN "imageUrls" SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "departmentId" INTEGER;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "batchId" INTEGER;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "sectionId" INTEGER;

-- Backfill from legacy arrays only when those columns still exist (dynamic SQL for parse safety)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'targetDeptIds'
  ) THEN
    EXECUTE 'UPDATE "Announcement" SET "departmentId" = ("targetDeptIds")[1] WHERE "targetDeptIds" IS NOT NULL AND cardinality("targetDeptIds") >= 1';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'targetBatchIds'
  ) THEN
    EXECUTE 'UPDATE "Announcement" SET "batchId" = ("targetBatchIds")[1] WHERE "targetBatchIds" IS NOT NULL AND cardinality("targetBatchIds") >= 1';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'targetSectionIds'
  ) THEN
    EXECUTE 'UPDATE "Announcement" SET "sectionId" = ("targetSectionIds")[1] WHERE "targetSectionIds" IS NOT NULL AND cardinality("targetSectionIds") >= 1';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'targetFacultyIds'
  ) THEN
    EXECUTE 'UPDATE "Announcement" SET "facultyId" = COALESCE("facultyId", ("targetFacultyIds")[1]) WHERE "targetFacultyIds" IS NOT NULL AND cardinality("targetFacultyIds") >= 1';
  END IF;
END $$;

-- priority: add or convert enum -> text
DO $$
DECLARE
  typ regtype;
BEGIN
  SELECT a.atttypid::regtype INTO typ
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  WHERE c.relname = 'Announcement' AND a.attname = 'priority' AND NOT a.attisdropped AND a.attnum > 0;

  IF typ IS NULL THEN
    ALTER TABLE "Announcement" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';
  ELSIF typ::text <> 'text' THEN
    ALTER TABLE "Announcement" ALTER COLUMN "priority" DROP DEFAULT;
    ALTER TABLE "Announcement" ALTER COLUMN "priority" TYPE TEXT USING ("priority"::text);
    ALTER TABLE "Announcement" ALTER COLUMN "priority" SET DEFAULT 'normal';
    ALTER TABLE "Announcement" ALTER COLUMN "priority" SET NOT NULL;
  END IF;
END $$;

-- targetType: add or convert enum -> text
DO $$
DECLARE
  typ regtype;
BEGIN
  SELECT a.atttypid::regtype INTO typ
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  WHERE c.relname = 'Announcement' AND a.attname = 'targetType' AND NOT a.attisdropped AND a.attnum > 0;

  IF typ IS NULL THEN
    ALTER TABLE "Announcement" ADD COLUMN "targetType" TEXT NOT NULL DEFAULT 'ALL';
  ELSIF typ::text <> 'text' THEN
    ALTER TABLE "Announcement" ALTER COLUMN "targetType" DROP DEFAULT;
    ALTER TABLE "Announcement" ALTER COLUMN "targetType" TYPE TEXT USING ("targetType"::text);
    ALTER TABLE "Announcement" ALTER COLUMN "targetType" SET DEFAULT 'ALL';
    ALTER TABLE "Announcement" ALTER COLUMN "targetType" SET NOT NULL;
  END IF;
END $$;

UPDATE "Announcement" SET "targetType" = CASE
  WHEN "sectionId" IS NOT NULL THEN 'SECTION'
  WHEN "batchId" IS NOT NULL THEN 'BATCH'
  WHEN "departmentId" IS NOT NULL THEN 'DEPARTMENT'
  WHEN "facultyId" IS NOT NULL THEN 'FACULTY'
  ELSE 'ALL'
END;

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'status'
  ) THEN
    UPDATE "Announcement" SET "isActive" = (status::text <> 'EXPIRED');
  END IF;
END $$;

-- Drop legacy columns (IF EXISTS per column for idempotency on re-run / mixed DBs)
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "expire_at";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "publish_at";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "targetBatchIds";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "targetDeptIds";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "targetFacultyIds";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "targetSectionIds";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "targetRoles";
ALTER TABLE "Announcement" DROP COLUMN IF EXISTS "status";

DROP TYPE IF EXISTS "AnnouncementStatus";
DROP TYPE IF EXISTS "AnnouncementPriority";
DROP TYPE IF EXISTS "AnnouncementTargetType";

CREATE INDEX IF NOT EXISTS "Announcement_facultyId_idx" ON "Announcement"("facultyId");
CREATE INDEX IF NOT EXISTS "Announcement_departmentId_idx" ON "Announcement"("departmentId");
CREATE INDEX IF NOT EXISTS "Announcement_batchId_idx" ON "Announcement"("batchId");
CREATE INDEX IF NOT EXISTS "Announcement_sectionId_idx" ON "Announcement"("sectionId");
CREATE INDEX IF NOT EXISTS "Announcement_targetType_idx" ON "Announcement"("targetType");
CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_departmentId_fkey'
  ) THEN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_batchId_fkey'
  ) THEN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_sectionId_fkey'
  ) THEN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_sectionId_fkey"
      FOREIGN KEY ("sectionId") REFERENCES "BatchSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
