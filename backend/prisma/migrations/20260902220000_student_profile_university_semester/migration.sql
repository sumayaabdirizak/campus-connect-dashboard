-- Per-student semester + academic year from university AIS (display + sync source of truth)
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "university_academic_year" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "university_semester_number" INTEGER;
