-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "editedAt" TIMESTAMP(3);

-- CreateTable: ChatAttachment
CREATE TABLE "ChatAttachment" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ChatMessageMention
CREATE TABLE "ChatMessageMention" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageMention_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatMessageMention_messageId_userId_key"
  ON "ChatMessageMention"("messageId", "userId");
CREATE INDEX "ChatMessageMention_userId_idx" ON "ChatMessageMention"("userId");
ALTER TABLE "ChatMessageMention" ADD CONSTRAINT "ChatMessageMention_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageMention" ADD CONSTRAINT "ChatMessageMention_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
