-- CreateEnum
CREATE TYPE "AssignmentGradingMode" AS ENUM ('INDIVIDUAL', 'GROUP');

-- AlterTable: Assignment
ALTER TABLE "Assignment"
  ADD COLUMN "gradingMode" "AssignmentGradingMode" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "lateWindowMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Submission
ALTER TABLE "Submission"
  ADD COLUMN "groupId" INTEGER,
  ADD COLUMN "is_late" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Submission_groupId_idx" ON "Submission"("groupId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: SubmissionExtension
CREATE TABLE "SubmissionExtension" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "studentId" INTEGER,
    "groupId" INTEGER,
    "newDueAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "grantedById" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionExtension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionExtension_assignmentId_idx" ON "SubmissionExtension"("assignmentId");
CREATE UNIQUE INDEX "SubmissionExtension_assignmentId_studentId_key" ON "SubmissionExtension"("assignmentId", "studentId");
CREATE UNIQUE INDEX "SubmissionExtension_assignmentId_groupId_key" ON "SubmissionExtension"("assignmentId", "groupId");

-- AddForeignKey
ALTER TABLE "SubmissionExtension" ADD CONSTRAINT "SubmissionExtension_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubmissionExtension" ADD CONSTRAINT "SubmissionExtension_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionExtension" ADD CONSTRAINT "SubmissionExtension_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubmissionExtension" ADD CONSTRAINT "SubmissionExtension_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
