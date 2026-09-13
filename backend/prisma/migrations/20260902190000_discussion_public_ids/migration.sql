-- UUID publicId columns for discussion entities (schema drift fix).
-- Mirrors 20260614120000_course_offering_public_id pattern.

ALTER TABLE "DiscussionGroup" ADD COLUMN IF NOT EXISTS "publicId" UUID;
UPDATE "DiscussionGroup" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "DiscussionGroup" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "DiscussionGroup" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionGroup_publicId_key" ON "DiscussionGroup"("publicId");

ALTER TABLE "DiscussionChannelCategory" ADD COLUMN IF NOT EXISTS "publicId" UUID;
UPDATE "DiscussionChannelCategory" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "DiscussionChannelCategory" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "DiscussionChannelCategory" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionChannelCategory_publicId_key" ON "DiscussionChannelCategory"("publicId");

ALTER TABLE "DiscussionChannel" ADD COLUMN IF NOT EXISTS "publicId" UUID;
UPDATE "DiscussionChannel" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "DiscussionChannel" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "DiscussionChannel" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionChannel_publicId_key" ON "DiscussionChannel"("publicId");

ALTER TABLE "GroupDm" ADD COLUMN IF NOT EXISTS "publicId" UUID;
UPDATE "GroupDm" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "GroupDm" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "GroupDm" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "GroupDm_publicId_key" ON "GroupDm"("publicId");

ALTER TABLE "DiscussionMessage" ADD COLUMN IF NOT EXISTS "publicId" UUID;
UPDATE "DiscussionMessage" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "DiscussionMessage" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "DiscussionMessage" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionMessage_publicId_key" ON "DiscussionMessage"("publicId");

ALTER TABLE "DiscussionAttachment" ADD COLUMN IF NOT EXISTS "publicId" UUID;
UPDATE "DiscussionAttachment" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "DiscussionAttachment" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "DiscussionAttachment" ALTER COLUMN "publicId" SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionAttachment_publicId_key" ON "DiscussionAttachment"("publicId");
