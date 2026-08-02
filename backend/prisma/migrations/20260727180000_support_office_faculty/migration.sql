-- AlterTable
ALTER TABLE "SupportOffice" ADD COLUMN IF NOT EXISTS "facultyId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SupportOffice_facultyId_key" ON "SupportOffice"("facultyId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SupportOffice_facultyId_fkey'
  ) THEN
    ALTER TABLE "SupportOffice"
      ADD CONSTRAINT "SupportOffice_facultyId_fkey"
      FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
