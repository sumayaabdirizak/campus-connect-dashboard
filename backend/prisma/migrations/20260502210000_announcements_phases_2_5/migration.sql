-- Phase 2–5: Web Push, engagement, full-text search, templates (additive)

CREATE TABLE IF NOT EXISTS "WebPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "WebPushSubscription_userId_idx" ON "WebPushSubscription"("userId");
DO $$ BEGIN
  ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AnnouncementComment" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "parentId" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnnouncementComment_announcementId_idx" ON "AnnouncementComment"("announcementId");
CREATE INDEX IF NOT EXISTS "AnnouncementComment_authorId_idx" ON "AnnouncementComment"("authorId");
DO $$ BEGIN
  ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "AnnouncementComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AnnouncementReaction" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    CONSTRAINT "AnnouncementReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementReaction_announcementId_userId_emoji_key"
  ON "AnnouncementReaction"("announcementId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "AnnouncementReaction_announcementId_idx" ON "AnnouncementReaction"("announcementId");
DO $$ BEGIN
  ALTER TABLE "AnnouncementReaction" ADD CONSTRAINT "AnnouncementReaction_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AnnouncementReaction" ADD CONSTRAINT "AnnouncementReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AnnouncementAcknowledgement" (
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementAcknowledgement_pkey" PRIMARY KEY ("announcementId","userId")
);
CREATE INDEX IF NOT EXISTS "AnnouncementAcknowledgement_userId_idx" ON "AnnouncementAcknowledgement"("userId");
DO $$ BEGIN
  ALTER TABLE "AnnouncementAcknowledgement" ADD CONSTRAINT "AnnouncementAcknowledgement_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AnnouncementAcknowledgement" ADD CONSTRAINT "AnnouncementAcknowledgement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AnnouncementTemplate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "defaultTargets" JSONB,
    "defaultRoles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnnouncementTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnnouncementTemplate_userId_idx" ON "AnnouncementTemplate"("userId");
DO $$ BEGIN
  ALTER TABLE "AnnouncementTemplate" ADD CONSTRAINT "AnnouncementTemplate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;
CREATE INDEX IF NOT EXISTS "Announcement_searchVector_idx" ON "Announcement" USING GIN ("searchVector");

CREATE OR REPLACE FUNCTION announcement_searchvector_update() RETURNS trigger AS $$
DECLARE
  body_text TEXT;
BEGIN
  body_text := coalesce(NEW."bodyMarkdown", NEW."content", '');
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', body_text), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', body_text), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcement_searchvector_trigger ON "Announcement";
CREATE TRIGGER announcement_searchvector_trigger
  BEFORE INSERT OR UPDATE OF "title", "content", "bodyMarkdown" ON "Announcement"
  FOR EACH ROW EXECUTE PROCEDURE announcement_searchvector_update();

UPDATE "Announcement" SET "title" = "title" WHERE "searchVector" IS NULL;
