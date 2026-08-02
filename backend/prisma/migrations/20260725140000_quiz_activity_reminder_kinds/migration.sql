-- Quiz open / closing / graded activity kinds + reminder dedupe stamps
ALTER TYPE "CourseActivityKind" ADD VALUE 'QUIZ_OPENING';
ALTER TYPE "CourseActivityKind" ADD VALUE 'QUIZ_CLOSING_SOON';
ALTER TYPE "CourseActivityKind" ADD VALUE 'QUIZ_GRADED';

ALTER TABLE "Quiz" ADD COLUMN "open_notified_at" TIMESTAMP(3);
ALTER TABLE "Quiz" ADD COLUMN "closing_notified_at" TIMESTAMP(3);
