-- Course mark weight for quizzes (share of course maxMarks budget with assignments).
ALTER TABLE "Quiz" ADD COLUMN "maxMarks" INTEGER NOT NULL DEFAULT 0;

-- Backfill from marks plan total where available.
UPDATE "Quiz"
SET "maxMarks" = CAST(("marksPlan"::json->>'totalMarks') AS INTEGER)
WHERE "is_draft" = false
  AND "maxMarks" = 0
  AND "marksPlan" IS NOT NULL
  AND ("marksPlan"::json->>'totalMarks') ~ '^[0-9]+$';
