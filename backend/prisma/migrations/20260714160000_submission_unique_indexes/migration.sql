-- Dedupe any legacy rows before uniqueness (keep highest id per assignment+student).
DELETE FROM "Submission" a
USING "Submission" b
WHERE a."assignmentId" = b."assignmentId"
  AND a."studentId" = b."studentId"
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS "Submission_assignmentId_studentId_key"
  ON "Submission"("assignmentId", "studentId");

CREATE INDEX IF NOT EXISTS "Submission_assignmentId_idx" ON "Submission"("assignmentId");
CREATE INDEX IF NOT EXISTS "Submission_studentId_idx" ON "Submission"("studentId");
