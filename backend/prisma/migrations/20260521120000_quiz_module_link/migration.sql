-- Step 11: Link quizzes to course modules (chapters).
--
-- A quiz can optionally belong to a module ("Week 1", "Module 2", …) — the
-- same module rows already used by resources. `moduleId` is nullable so the
-- existing fleet of quizzes lands in the "Ungrouped" bucket on the frontend
-- without any backfill work.
--
-- The FK uses `ON DELETE SET NULL` (not Cascade) — deleting a module should
-- not nuke the quizzes that referenced it. Teachers can re-bucket them
-- afterwards.

ALTER TABLE "Quiz"
  ADD COLUMN "moduleId" INTEGER;

ALTER TABLE "Quiz"
  ADD CONSTRAINT "Quiz_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Helps the offering-scoped list grouped-by-module query and the per-module
-- count we render on the chapter accordion header.
CREATE INDEX "Quiz_moduleId_idx" ON "Quiz"("moduleId");
