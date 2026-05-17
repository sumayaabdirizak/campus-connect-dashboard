-- Hard-delete channel (A10): removing a channel must remove its messages;
-- attachments/reactions/receipts already cascade from DiscussionMessage.
ALTER TABLE "DiscussionMessage" DROP CONSTRAINT IF EXISTS "DiscussionMessage_channelId_fkey";
ALTER TABLE "DiscussionMessage"
  ADD CONSTRAINT "DiscussionMessage_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "DiscussionChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
