-- Phase 1: announcement enums, status/body/slug fields, targets, attachments, audit

-- Enums
DO $$ BEGIN CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AnnouncementBroadcastScope" AS ENUM ('ALL', 'FACULTY', 'DEPARTMENT', 'BATCH', 'SECTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AnnouncementTargetScopeType" AS ENUM ('FACULTY', 'DEPARTMENT', 'BATCH', 'SECTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AnnouncementAttachmentKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'LINK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Convert priority TEXT -> enum
ALTER TABLE "Announcement" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Announcement" ALTER COLUMN "priority" TYPE "AnnouncementPriority" USING (
  CASE LOWER(TRIM("priority"::text))
    WHEN 'important' THEN 'IMPORTANT'::"AnnouncementPriority"
    WHEN 'urgent' THEN 'URGENT'::"AnnouncementPriority"
    ELSE 'NORMAL'::"AnnouncementPriority"
  END
);
ALTER TABLE "Announcement" ALTER COLUMN "priority" SET DEFAULT 'NORMAL'::"AnnouncementPriority";

-- Convert targetType TEXT -> enum
ALTER TABLE "Announcement" ALTER COLUMN "targetType" DROP DEFAULT;
ALTER TABLE "Announcement" ALTER COLUMN "targetType" TYPE "AnnouncementBroadcastScope" USING (
  CASE UPPER(TRIM("targetType"::text))
    WHEN 'FACULTY' THEN 'FACULTY'::"AnnouncementBroadcastScope"
    WHEN 'DEPARTMENT' THEN 'DEPARTMENT'::"AnnouncementBroadcastScope"
    WHEN 'BATCH' THEN 'BATCH'::"AnnouncementBroadcastScope"
    WHEN 'SECTION' THEN 'SECTION'::"AnnouncementBroadcastScope"
    ELSE 'ALL'::"AnnouncementBroadcastScope"
  END
);
ALTER TABLE "Announcement" ALTER COLUMN "targetType" SET DEFAULT 'ALL'::"AnnouncementBroadcastScope";

-- New Announcement columns
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "status" "AnnouncementStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "bodyMarkdown" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "bodyHtml" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "commentsEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Announcement" SET "bodyMarkdown" = "content" WHERE "bodyMarkdown" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Announcement_slug_key" ON "Announcement"("slug") WHERE "slug" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Announcement_status_idx" ON "Announcement"("status");

-- AnnouncementTarget
CREATE TABLE IF NOT EXISTS "AnnouncementTarget" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "scopeType" "AnnouncementTargetScopeType" NOT NULL,
    "scopeId" INTEGER NOT NULL,

    CONSTRAINT "AnnouncementTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementTarget_announcementId_scopeType_scopeId_key"
  ON "AnnouncementTarget"("announcementId", "scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "AnnouncementTarget_scopeType_scopeId_idx" ON "AnnouncementTarget"("scopeType", "scopeId");
CREATE INDEX IF NOT EXISTS "AnnouncementTarget_announcementId_idx" ON "AnnouncementTarget"("announcementId");

DO $$ BEGIN
  ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill targets from flat FKs (idempotent)
INSERT INTO "AnnouncementTarget" ("announcementId", "scopeType", "scopeId")
SELECT a.id, 'FACULTY'::"AnnouncementTargetScopeType", a."facultyId"
FROM "Announcement" a
WHERE a."facultyId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "AnnouncementTarget" t
    WHERE t."announcementId" = a.id AND t."scopeType" = 'FACULTY'::"AnnouncementTargetScopeType" AND t."scopeId" = a."facultyId"
  );

INSERT INTO "AnnouncementTarget" ("announcementId", "scopeType", "scopeId")
SELECT a.id, 'DEPARTMENT'::"AnnouncementTargetScopeType", a."departmentId"
FROM "Announcement" a
WHERE a."departmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "AnnouncementTarget" t
    WHERE t."announcementId" = a.id AND t."scopeType" = 'DEPARTMENT'::"AnnouncementTargetScopeType" AND t."scopeId" = a."departmentId"
  );

INSERT INTO "AnnouncementTarget" ("announcementId", "scopeType", "scopeId")
SELECT a.id, 'BATCH'::"AnnouncementTargetScopeType", a."batchId"
FROM "Announcement" a
WHERE a."batchId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "AnnouncementTarget" t
    WHERE t."announcementId" = a.id AND t."scopeType" = 'BATCH'::"AnnouncementTargetScopeType" AND t."scopeId" = a."batchId"
  );

INSERT INTO "AnnouncementTarget" ("announcementId", "scopeType", "scopeId")
SELECT a.id, 'SECTION'::"AnnouncementTargetScopeType", a."sectionId"
FROM "Announcement" a
WHERE a."sectionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "AnnouncementTarget" t
    WHERE t."announcementId" = a.id AND t."scopeType" = 'SECTION'::"AnnouncementTargetScopeType" AND t."scopeId" = a."sectionId"
  );

-- AnnouncementAttachment
CREATE TABLE IF NOT EXISTS "AnnouncementAttachment" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "kind" "AnnouncementAttachmentKind" NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" BIGINT,
    "thumbnailUrl" TEXT,
    "storageKey" TEXT,
    "virusScanStatus" TEXT DEFAULT 'PENDING',

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");
DO $$ BEGIN
  ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AnnouncementAudit
CREATE TABLE IF NOT EXISTS "AnnouncementAudit" (
    "id" TEXT NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnnouncementAudit_announcementId_idx" ON "AnnouncementAudit"("announcementId");
CREATE INDEX IF NOT EXISTS "AnnouncementAudit_actorId_idx" ON "AnnouncementAudit"("actorId");
CREATE INDEX IF NOT EXISTS "AnnouncementAudit_createdAt_idx" ON "AnnouncementAudit"("createdAt");
DO $$ BEGIN
  ALTER TABLE "AnnouncementAudit" ADD CONSTRAINT "AnnouncementAudit_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AnnouncementAudit" ADD CONSTRAINT "AnnouncementAudit_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
