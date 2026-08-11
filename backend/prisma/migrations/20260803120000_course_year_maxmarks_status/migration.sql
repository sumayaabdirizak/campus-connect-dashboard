-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Course"
  ADD COLUMN "year" INTEGER,
  ADD COLUMN "maxMarks" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Course_status_idx" ON "Course"("status");
