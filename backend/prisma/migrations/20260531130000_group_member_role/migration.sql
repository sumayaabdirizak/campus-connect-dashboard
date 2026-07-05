-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('LEADER', 'MEMBER');

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER';
