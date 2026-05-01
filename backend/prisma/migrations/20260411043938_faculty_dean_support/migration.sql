-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN     "deanId" INTEGER;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_deanId_fkey" FOREIGN KEY ("deanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
