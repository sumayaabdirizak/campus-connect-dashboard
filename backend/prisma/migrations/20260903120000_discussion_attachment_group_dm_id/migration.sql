-- DiscussionAttachment.groupDmId was added to schema for group-DM uploads but never migrated.
ALTER TABLE "DiscussionAttachment" ADD COLUMN IF NOT EXISTS "groupDmId" INTEGER;

CREATE INDEX IF NOT EXISTS "DiscussionAttachment_groupDmId_createdAt_idx"
  ON "DiscussionAttachment"("groupDmId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "DiscussionAttachment"
    ADD CONSTRAINT "DiscussionAttachment_groupDmId_fkey"
    FOREIGN KEY ("groupDmId") REFERENCES "GroupDm"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
