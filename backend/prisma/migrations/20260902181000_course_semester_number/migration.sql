-- Course.semesterNumber exists in schema.prisma but was never migrated.

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "semesterNumber" INTEGER;
CREATE INDEX IF NOT EXISTS "Course_semesterNumber_idx" ON "Course"("semesterNumber");
