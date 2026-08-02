-- Assignment lifecycle + submission grade normalization (Phase 1)

-- Soften XOR: fix invalid rows before CHECK
DELETE FROM "SubmissionExtension" WHERE "studentId" IS NULL AND "groupId" IS NULL;
UPDATE "SubmissionExtension" SET "groupId" = NULL
WHERE "studentId" IS NOT NULL AND "groupId" IS NOT NULL;

CREATE TYPE "AssignmentPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AssignmentScheduleStatus" AS ENUM ('SCHEDULED', 'OPEN', 'CLOSED');
CREATE TYPE "AssignmentLifecycleEventType" AS ENUM (
  'CREATED',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
  'SCHEDULE_CHANGED',
  'DUPLICATED'
);
CREATE TYPE "SubmissionLateState" AS ENUM ('ON_TIME', 'LATE');

CREATE TABLE "AssignmentLifecycle" (
  "assignmentId" INTEGER NOT NULL,
  "publishStatus" "AssignmentPublishStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduleStatus" "AssignmentScheduleStatus" NOT NULL DEFAULT 'OPEN',
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssignmentLifecycle_pkey" PRIMARY KEY ("assignmentId")
);

CREATE TABLE "AssignmentLifecycleEvent" (
  "id" SERIAL NOT NULL,
  "assignmentId" INTEGER NOT NULL,
  "eventType" "AssignmentLifecycleEventType" NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "actorUserId" INTEGER,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssignmentLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionGrade" (
  "submissionId" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "feedback" TEXT,
  "gradedById" INTEGER,
  "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubmissionGrade_pkey" PRIMARY KEY ("submissionId")
);

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "lateState" "SubmissionLateState" NOT NULL DEFAULT 'ON_TIME';

UPDATE "Submission"
SET "lateState" = CASE WHEN "is_late" THEN 'LATE'::"SubmissionLateState" ELSE 'ON_TIME'::"SubmissionLateState" END;

INSERT INTO "AssignmentLifecycle" ("assignmentId", "publishStatus", "scheduleStatus", "computedAt", "updatedAt")
SELECT
  a."id",
  CASE WHEN a."is_draft" THEN 'DRAFT'::"AssignmentPublishStatus" ELSE 'PUBLISHED'::"AssignmentPublishStatus" END,
  CASE
    WHEN a."open_at" IS NOT NULL AND a."open_at" > NOW() THEN 'SCHEDULED'::"AssignmentScheduleStatus"
    WHEN (a."due_date" + (COALESCE(a."lateWindowMinutes", 0) * INTERVAL '1 minute')) < NOW()
      THEN 'CLOSED'::"AssignmentScheduleStatus"
    ELSE 'OPEN'::"AssignmentScheduleStatus"
  END,
  NOW(),
  NOW()
FROM "Assignment" a
ON CONFLICT ("assignmentId") DO NOTHING;

INSERT INTO "AssignmentLifecycleEvent" ("assignmentId", "eventType", "fromStatus", "toStatus", "createdAt")
SELECT
  a."id",
  'CREATED'::"AssignmentLifecycleEventType",
  NULL,
  CASE WHEN a."is_draft" THEN 'DRAFT' ELSE 'PUBLISHED' END,
  a."created_at"
FROM "Assignment" a;

INSERT INTO "SubmissionGrade" ("submissionId", "score", "feedback", "gradedAt", "updatedAt")
SELECT
  s."id",
  COALESCE(s."grade", 0),
  s."feedback",
  COALESCE(s."submitted_at", NOW()),
  NOW()
FROM "Submission" s
WHERE s."is_reviewed" = true OR s."grade" IS NOT NULL
ON CONFLICT ("submissionId") DO NOTHING;

ALTER TABLE "AssignmentLifecycle"
  ADD CONSTRAINT "AssignmentLifecycle_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssignmentLifecycleEvent"
  ADD CONSTRAINT "AssignmentLifecycleEvent_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssignmentLifecycleEvent"
  ADD CONSTRAINT "AssignmentLifecycleEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SubmissionGrade"
  ADD CONSTRAINT "SubmissionGrade_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionGrade"
  ADD CONSTRAINT "SubmissionGrade_gradedById_fkey"
  FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AssignmentLifecycle_publishStatus_idx" ON "AssignmentLifecycle"("publishStatus");
CREATE INDEX "AssignmentLifecycle_scheduleStatus_idx" ON "AssignmentLifecycle"("scheduleStatus");
CREATE INDEX "AssignmentLifecycleEvent_assignmentId_createdAt_idx" ON "AssignmentLifecycleEvent"("assignmentId", "createdAt");
CREATE INDEX "AssignmentLifecycleEvent_actorUserId_idx" ON "AssignmentLifecycleEvent"("actorUserId");
CREATE INDEX "SubmissionGrade_gradedAt_idx" ON "SubmissionGrade"("gradedAt");
CREATE INDEX "SubmissionGrade_gradedById_idx" ON "SubmissionGrade"("gradedById");

ALTER TABLE "SubmissionExtension"
  ADD CONSTRAINT "SubmissionExtension_student_xor_group"
  CHECK (
    ("studentId" IS NOT NULL AND "groupId" IS NULL)
    OR ("studentId" IS NULL AND "groupId" IS NOT NULL)
  );
