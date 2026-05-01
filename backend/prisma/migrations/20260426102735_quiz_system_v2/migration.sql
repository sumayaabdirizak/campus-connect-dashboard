/*
  Warnings:

  - You are about to drop the column `completed_at` on the `QuizAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `needs_grading` on the `QuizAttempt` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT_ANSWER');

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "courseOfferingId" INTEGER,
ADD COLUMN     "isGroupChat" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "close_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "max_attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "open_at" TIMESTAMP(3),
ADD COLUMN     "passing_score" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "scheduled_duration" INTEGER,
ADD COLUMN     "shuffle_answers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timing_mode" TEXT NOT NULL DEFAULT 'flexible';

-- AlterTable
ALTER TABLE "QuizAttempt" DROP COLUMN "completed_at",
DROP COLUMN "needs_grading",
ADD COLUMN     "closure_reason" TEXT,
ADD COLUMN     "grade" DOUBLE PRECISION,
ADD COLUMN     "is_graded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "violations_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warnings_shown" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "QuizOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" SERIAL NOT NULL,
    "quizId" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "correct_answer" TEXT,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "course_code" TEXT,
    "topic" TEXT,
    "difficulty" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOptionBank" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionOptionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "QuestionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "question_type" TEXT NOT NULL,
    "selected_option_id" INTEGER,
    "text_answer" TEXT,
    "is_correct" BOOLEAN,
    "points_earned" DOUBLE PRECISION,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "courseOfferingId" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionTag_name_key" ON "QuestionTag"("name");

-- CreateIndex
CREATE INDEX "QuestionTag_name_idx" ON "QuestionTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_memberId_key" ON "GroupMember"("groupId", "memberId");

-- AddForeignKey
ALTER TABLE "QuizOption" ADD CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOptionBank" ADD CONSTRAINT "QuestionOptionBank_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGroup" ADD CONSTRAINT "CourseGroup_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
