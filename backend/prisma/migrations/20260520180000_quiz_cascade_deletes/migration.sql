-- Recreate Quiz-family foreign keys with ON DELETE CASCADE so a single
-- `prisma.quiz.delete()` cleans up questions, options, attempts, and answers
-- atomically. Previously the controller walked a chain of `deleteMany` calls
-- by hand — fragile if the request crashed mid-loop.

ALTER TABLE "QuizQuestion" DROP CONSTRAINT IF EXISTS "QuizQuestion_quizId_fkey";
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizOption" DROP CONSTRAINT IF EXISTS "QuizOption_questionId_fkey";
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAttempt" DROP CONSTRAINT IF EXISTS "QuizAttempt_quizId_fkey";
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAnswer" DROP CONSTRAINT IF EXISTS "QuizAnswer_attemptId_fkey";
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAnswer" DROP CONSTRAINT IF EXISTS "QuizAnswer_questionId_fkey";
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestionOptionBank" DROP CONSTRAINT IF EXISTS "QuestionOptionBank_questionId_fkey";
ALTER TABLE "QuestionOptionBank" ADD CONSTRAINT "QuestionOptionBank_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
