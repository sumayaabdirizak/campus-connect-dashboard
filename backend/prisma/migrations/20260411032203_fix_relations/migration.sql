-- AlterTable
ALTER TABLE "User" ADD COLUMN     "departmentId" INTEGER;

-- CreateTable
CREATE TABLE "StudentRegistration" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "batchSectionId" INTEGER NOT NULL,
    "registrationAcademicYearId" INTEGER NOT NULL,
    "currentAcademicYearId" INTEGER NOT NULL,
    "currentSemesterId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "sectionId" INTEGER,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRegistration" ADD CONSTRAINT "StudentRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRegistration" ADD CONSTRAINT "StudentRegistration_batchSectionId_fkey" FOREIGN KEY ("batchSectionId") REFERENCES "BatchSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRegistration" ADD CONSTRAINT "StudentRegistration_registrationAcademicYearId_fkey" FOREIGN KEY ("registrationAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRegistration" ADD CONSTRAINT "StudentRegistration_currentAcademicYearId_fkey" FOREIGN KEY ("currentAcademicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentRegistration" ADD CONSTRAINT "StudentRegistration_currentSemesterId_fkey" FOREIGN KEY ("currentSemesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "BatchSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
