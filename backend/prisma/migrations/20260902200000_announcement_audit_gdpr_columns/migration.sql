-- Announcement audit GDPR columns (schema drift).
ALTER TABLE "AnnouncementAudit" ADD COLUMN IF NOT EXISTS "actorIdHash" TEXT;
ALTER TABLE "AnnouncementAudit" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- actorId nullable after user erasure (schema allows null).
ALTER TABLE "AnnouncementAudit" ALTER COLUMN "actorId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "AnnouncementAudit_expiresAt_idx" ON "AnnouncementAudit"("expiresAt");

-- AnnouncementRead retention column.
ALTER TABLE "AnnouncementRead" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AnnouncementRead_expiresAt_idx" ON "AnnouncementRead"("expiresAt");

-- WCAG alt text on attachments.
ALTER TABLE "AnnouncementAttachment" ADD COLUMN IF NOT EXISTS "altText" TEXT;
