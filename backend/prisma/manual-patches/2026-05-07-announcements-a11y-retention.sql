-- Surgical patch to bring the dev DB in line with schema.prisma.
-- Idempotent: safe to re-run.

-- Pre-existing missing column (was in schema.prisma but never migrated).
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- Phase 1 a11y / privacy additions.
ALTER TABLE "AnnouncementAttachment" ADD COLUMN IF NOT EXISTS "altText" TEXT;

ALTER TABLE "AnnouncementAudit" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "AnnouncementAudit" ADD COLUMN IF NOT EXISTS "actorIdHash" TEXT;
CREATE INDEX IF NOT EXISTS "AnnouncementAudit_expiresAt_idx" ON "AnnouncementAudit"("expiresAt");

-- Make actorId nullable + flip cascade to SET NULL so user erasure can null it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AnnouncementAudit'
      AND column_name = 'actorId'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "AnnouncementAudit" ALTER COLUMN "actorId" DROP NOT NULL;
  END IF;
END
$$;

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = '"AnnouncementAudit"'::regclass
    AND contype = 'f'
    AND conname LIKE '%actorId%';
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "AnnouncementAudit" DROP CONSTRAINT %I', fk_name);
  END IF;
  ALTER TABLE "AnnouncementAudit"
    ADD CONSTRAINT "AnnouncementAudit_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL;
END
$$;

ALTER TABLE "AnnouncementRead" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AnnouncementRead_expiresAt_idx" ON "AnnouncementRead"("expiresAt");
