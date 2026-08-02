-- WhatsApp-style quote replies (separate from Discord-style parentMessageId threads).
ALTER TABLE "DiscussionMessage" ADD COLUMN IF NOT EXISTS "replyToMessageId" INTEGER;

CREATE INDEX IF NOT EXISTS "DiscussionMessage_replyToMessageId_idx"
  ON "DiscussionMessage"("replyToMessageId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DiscussionMessage_replyToMessageId_fkey'
  ) THEN
    ALTER TABLE "DiscussionMessage"
      ADD CONSTRAINT "DiscussionMessage_replyToMessageId_fkey"
      FOREIGN KEY ("replyToMessageId") REFERENCES "DiscussionMessage"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
