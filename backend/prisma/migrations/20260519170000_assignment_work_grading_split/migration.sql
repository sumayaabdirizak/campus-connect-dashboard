-- Split Assignment.gradingMode into two independent fields:
--   workMode      = how work is produced  (INDIVIDUAL or GROUP)
--   gradingScope  = how grade is recorded (INDIVIDUAL or GROUP)
-- Existing rows: gradingMode=INDIVIDUAL → both new fields INDIVIDUAL;
--                gradingMode=GROUP      → both new fields GROUP.

-- CreateEnum
CREATE TYPE "AssignmentWorkMode" AS ENUM ('INDIVIDUAL', 'GROUP');
CREATE TYPE "AssignmentGradingScope" AS ENUM ('INDIVIDUAL', 'GROUP');

-- AlterTable: add new columns with INDIVIDUAL defaults
ALTER TABLE "Assignment"
  ADD COLUMN "workMode" "AssignmentWorkMode" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "gradingScope" "AssignmentGradingScope" NOT NULL DEFAULT 'INDIVIDUAL';

-- Backfill from the old gradingMode column
UPDATE "Assignment" SET "workMode" = 'GROUP', "gradingScope" = 'GROUP'
  WHERE "gradingMode" = 'GROUP';

-- Drop the old enum-typed column
ALTER TABLE "Assignment" DROP COLUMN "gradingMode";

-- Drop the old enum type
DROP TYPE "AssignmentGradingMode";
