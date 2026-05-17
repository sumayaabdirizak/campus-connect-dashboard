-- AlterEnum
ALTER TYPE "DiscussionMessageType" ADD VALUE 'QUESTION';

-- AlterTable
ALTER TABLE "DiscussionMessage" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
