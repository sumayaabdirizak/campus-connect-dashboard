-- Phase 3: drop denormalized assignment/submission columns (lifecycle + gradeRow are source of truth)

ALTER TABLE "Assignment" DROP COLUMN IF EXISTS "is_draft";

ALTER TABLE "Submission" DROP COLUMN IF EXISTS "grade";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "feedback";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "is_reviewed";
ALTER TABLE "Submission" DROP COLUMN IF EXISTS "is_late";
