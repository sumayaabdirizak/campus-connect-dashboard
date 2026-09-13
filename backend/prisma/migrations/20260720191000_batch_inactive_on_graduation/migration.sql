-- Add INACTIVE to EnrollmentStatus (must commit before UPDATE in a separate statement)
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
