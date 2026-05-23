-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "replyToId" INTEGER;

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_created_at_idx" ON "ChatMessage"("roomId", "created_at");
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
