-- Align AnnouncementRead with Prisma: compound unique (announcementId, userId).
-- Column "read_at" unchanged; Prisma maps it to field readAt.

DROP INDEX IF EXISTS "AnnouncementRead_userId_announcementId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementRead_announcementId_userId_key"
  ON "AnnouncementRead"("announcementId", "userId");
