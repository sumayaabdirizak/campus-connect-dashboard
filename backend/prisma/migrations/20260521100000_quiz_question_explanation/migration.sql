-- Teacher-authored explanation rendered on the student's review screen
-- after submit. Nullable; only questions with an explanation render the
-- "Why?" block in the review UI.
ALTER TABLE "QuizQuestion" ADD COLUMN "explanation" TEXT;
