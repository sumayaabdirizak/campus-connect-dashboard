-- OfficeThread was removed in 20260830120000_remove_support_offices; skip on fresh databases.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'OfficeThread'
  ) THEN
    CREATE TABLE IF NOT EXISTS "OfficeThreadRead" (
        "id" SERIAL NOT NULL,
        "threadId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OfficeThreadRead_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "OfficeThreadRead_threadId_userId_key"
      ON "OfficeThreadRead"("threadId", "userId");
    CREATE INDEX IF NOT EXISTS "OfficeThreadRead_userId_idx"
      ON "OfficeThreadRead"("userId");

    BEGIN
      ALTER TABLE "OfficeThreadRead"
        ADD CONSTRAINT "OfficeThreadRead_threadId_fkey"
        FOREIGN KEY ("threadId") REFERENCES "OfficeThread"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TABLE "OfficeThreadRead"
        ADD CONSTRAINT "OfficeThreadRead_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
