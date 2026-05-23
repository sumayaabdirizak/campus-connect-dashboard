-- Server-authoritative deadline for in-progress quiz attempts. Stamped at
-- start = started_at + duration. The autoSubmitExpired background job scans
-- this column to finalize abandoned attempts so closing the tab can't lose a
-- student's progress.
ALTER TABLE "QuizAttempt" ADD COLUMN "expires_at" TIMESTAMP(3);

-- Partial index is much smaller — only un-submitted attempts are candidates
-- for the auto-submit scan, which keeps the index hot in cache.
CREATE INDEX "QuizAttempt_expires_at_idx" ON "QuizAttempt"("expires_at")
  WHERE "submitted_at" IS NULL;
