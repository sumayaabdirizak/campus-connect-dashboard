/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `AcademicYear` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Batch_programId_academic_year_name_key";

-- DropIndex
DROP INDEX "Batch_programId_idx";

-- CreateTable
CREATE TABLE "Semester" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "academicYearId" INTEGER NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
