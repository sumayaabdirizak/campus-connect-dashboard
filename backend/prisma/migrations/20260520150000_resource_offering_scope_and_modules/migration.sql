-- AlterTable: Resource picks up offering + module + position
ALTER TABLE "Resource"
  ADD COLUMN "courseOfferingId" INTEGER,
  ADD COLUMN "moduleId" INTEGER,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Resource_courseOfferingId_idx" ON "Resource"("courseOfferingId");
CREATE INDEX "Resource_moduleId_position_idx" ON "Resource"("moduleId", "position");

-- CreateTable: CourseModule
CREATE TABLE "CourseModule" (
    "id" SERIAL NOT NULL,
    "courseOfferingId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CourseModule_courseOfferingId_position_idx"
  ON "CourseModule"("courseOfferingId", "position");

-- ForeignKeys
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_courseOfferingId_fkey"
  FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseOfferingId_fkey"
  FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Best-effort backfill: existing rows used Resource.courseId as if it were a
-- CourseOffering id. We can't tell after the fact which row meant which,
-- so we leave courseOfferingId NULL for legacy rows — teachers can re-assign
-- them via the new module UI. The list endpoint falls back to the old
-- courseId match when the new column is null, so nothing disappears.
