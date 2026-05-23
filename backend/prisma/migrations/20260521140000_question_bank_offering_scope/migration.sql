-- Step 12: Scope the Question (bank) table to a CourseOffering + optional
-- chapter (CourseModule). The old shape was a flat list per teacher across
-- ALL their courses, keyed loosely by a `course_code` string — which (a)
-- doesn't survive course renames, (b) can't enforce RBAC at the DB level,
-- and (c) means deleting an offering orphans its bank rows.
--
-- We add the two FK columns as NULLABLE first so legacy rows survive the
-- migration. The controller then refuses to read/write any bank row whose
-- `courseOfferingId IS NULL` — those rows are effectively quarantined for
-- the teacher to re-home or delete. New rows must have it set.
--
-- Once the teacher community has migrated their banks, a follow-up migration
-- can flip the column to NOT NULL and drop the legacy `course_code` field.

ALTER TABLE "Question"
  ADD COLUMN "courseOfferingId" INTEGER,
  ADD COLUMN "moduleId" INTEGER;

ALTER TABLE "Question"
  ADD CONSTRAINT "Question_courseOfferingId_fkey"
    FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Question"
  ADD CONSTRAINT "Question_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Composite index for the canonical list query: "all bank rows on offering X,
-- optionally filtered by module". Adding `is_active` so the soft-delete
-- filter also rides this index.
CREATE INDEX "Question_courseOfferingId_moduleId_isActive_idx"
  ON "Question"("courseOfferingId", "moduleId", "is_active");
