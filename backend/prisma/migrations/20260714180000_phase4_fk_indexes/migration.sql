-- Phase 4: FK indexes called out in production review (M10)
CREATE INDEX IF NOT EXISTS "Department_facultyId_idx" ON "Department"("facultyId");
CREATE INDEX IF NOT EXISTS "Quiz_courseOfferingId_idx" ON "Quiz"("courseOfferingId");
CREATE INDEX IF NOT EXISTS "Announcement_createdById_idx" ON "Announcement"("createdById");
