-- CreateEnum
CREATE TYPE "SmsAuditLogStatus" AS ENUM ('SKIPPED', 'SENT', 'FAILED');

-- AlterTable: explicit SMS marketing / TCPA-style opt-in (default false for existing rows)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "smsOptIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SmsAuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "SmsAuditLogStatus" NOT NULL,
    "reason" VARCHAR(500),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsAuditLog_userId_sentAt_idx" ON "SmsAuditLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "SmsAuditLog_announcementId_sentAt_idx" ON "SmsAuditLog"("announcementId", "sentAt");

-- CreateIndex
CREATE INDEX "SmsAuditLog_sentAt_idx" ON "SmsAuditLog"("sentAt");

-- AddForeignKey
ALTER TABLE "SmsAuditLog" ADD CONSTRAINT "SmsAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsAuditLog" ADD CONSTRAINT "SmsAuditLog_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
