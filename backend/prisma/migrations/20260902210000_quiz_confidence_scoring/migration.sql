-- Quiz confidence scoring (schema field used by my-courses and quiz-taking).
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "confidence_scoring" BOOLEAN NOT NULL DEFAULT false;

-- Per-answer confidence for confidence-scored quizzes.
ALTER TABLE "QuizAnswer" ADD COLUMN IF NOT EXISTS "confidence" TEXT;
