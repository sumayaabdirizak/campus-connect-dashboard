-- SupportOffice was removed in a later migration; skip safely on fresh databases.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SupportOffice'
  ) THEN
    ALTER TABLE "SupportOffice" ADD COLUMN IF NOT EXISTS "facultyId" INTEGER;

    CREATE UNIQUE INDEX IF NOT EXISTS "SupportOffice_facultyId_key"
      ON "SupportOffice"("facultyId");

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'SupportOffice_facultyId_fkey'
    ) THEN
      ALTER TABLE "SupportOffice"
        ADD CONSTRAINT "SupportOffice_facultyId_fkey"
        FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
