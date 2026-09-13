-- CreateEnum
CREATE TYPE "SessionDay" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY');

-- CreateEnum
CREATE TYPE "SessionTimeSlot" AS ENUM ('SLOT_1', 'SLOT_2', 'SLOT_3', 'SLOT_4');

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" SERIAL NOT NULL,
    "courseOfferingId" INTEGER NOT NULL,
    "dayOfWeek" "SessionDay" NOT NULL,
    "timeSlot" "SessionTimeSlot" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSession_courseOfferingId_idx" ON "ClassSession"("courseOfferingId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_courseOfferingId_dayOfWeek_timeSlot_key" ON "ClassSession"("courseOfferingId", "dayOfWeek", "timeSlot");

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
