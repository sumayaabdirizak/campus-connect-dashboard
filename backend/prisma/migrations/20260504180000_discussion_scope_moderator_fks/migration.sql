-- Optional FKs for discussion auto-provisioning roles (dept head, batch advisor, section moderator).

ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "headUserId" INTEGER;
CREATE INDEX IF NOT EXISTS "Department_headUserId_idx" ON "Department"("headUserId");

ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "advisorUserId" INTEGER;
CREATE INDEX IF NOT EXISTS "Batch_advisorUserId_idx" ON "Batch"("advisorUserId");

ALTER TABLE "BatchSection" ADD COLUMN IF NOT EXISTS "moderatorUserId" INTEGER;
CREATE INDEX IF NOT EXISTS "BatchSection_moderatorUserId_idx" ON "BatchSection"("moderatorUserId");

DO $$
BEGIN
  ALTER TABLE "Department"
    ADD CONSTRAINT "Department_headUserId_fkey"
    FOREIGN KEY ("headUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Batch"
    ADD CONSTRAINT "Batch_advisorUserId_fkey"
    FOREIGN KEY ("advisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BatchSection"
    ADD CONSTRAINT "BatchSection_moderatorUserId_fkey"
    FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
