/*
  Warnings:

  - You are about to drop the column `is_global` on the `Announcement` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `Announcement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('ACTIVE', 'SCHEDULED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "is_global",
ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "expire_at" TIMESTAMP(3),
ADD COLUMN     "publish_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "AnnouncementStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "targetBatchIds" INTEGER[],
ADD COLUMN     "targetDeptIds" INTEGER[],
ADD COLUMN     "targetFacultyIds" INTEGER[],
ADD COLUMN     "targetRoles" TEXT[],
ADD COLUMN     "targetSectionIds" INTEGER[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CourseOffering" ADD COLUMN     "teacherId" INTEGER;

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_userId_announcementId_key" ON "AnnouncementRead"("userId", "announcementId");

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
