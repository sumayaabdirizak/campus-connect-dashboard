-- AnnouncementRead: String id (cuid), readAt column, compound unique + indexes on FKs.

ALTER TABLE "AnnouncementRead" RENAME TO "AnnouncementRead_old";

-- Avoid name collisions: Postgres keeps old constraint/index names after table rename.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AnnouncementRead_pkey'
      AND conrelid = '"AnnouncementRead_old"'::regclass
  ) THEN
    ALTER TABLE "AnnouncementRead_old" RENAME CONSTRAINT "AnnouncementRead_pkey" TO "AnnouncementRead_old_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AnnouncementRead_announcementId_userId_key'
      AND conrelid = '"AnnouncementRead_old"'::regclass
  ) THEN
    ALTER TABLE "AnnouncementRead_old" RENAME CONSTRAINT "AnnouncementRead_announcementId_userId_key" TO "AnnouncementRead_old_announcementId_userId_key";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AnnouncementRead_announcementId_fkey'
      AND conrelid = '"AnnouncementRead_old"'::regclass
  ) THEN
    ALTER TABLE "AnnouncementRead_old" RENAME CONSTRAINT "AnnouncementRead_announcementId_fkey" TO "AnnouncementRead_old_announcementId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AnnouncementRead_userId_fkey'
      AND conrelid = '"AnnouncementRead_old"'::regclass
  ) THEN
    ALTER TABLE "AnnouncementRead_old" RENAME CONSTRAINT "AnnouncementRead_userId_fkey" TO "AnnouncementRead_old_userId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"AnnouncementRead_pkey"') IS NOT NULL THEN
    ALTER INDEX "AnnouncementRead_pkey" RENAME TO "AnnouncementRead_old_pkey_idx";
  END IF;

  IF to_regclass('"AnnouncementRead_announcementId_userId_key"') IS NOT NULL THEN
    ALTER INDEX "AnnouncementRead_announcementId_userId_key" RENAME TO "AnnouncementRead_old_announcementId_userId_key_idx";
  END IF;

  IF to_regclass('"AnnouncementRead_userId_idx"') IS NOT NULL THEN
    ALTER INDEX "AnnouncementRead_userId_idx" RENAME TO "AnnouncementRead_old_userId_idx";
  END IF;

  IF to_regclass('"AnnouncementRead_announcementId_idx"') IS NOT NULL THEN
    ALTER INDEX "AnnouncementRead_announcementId_idx" RENAME TO "AnnouncementRead_old_announcementId_idx";
  END IF;
END $$;

CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AnnouncementRead_announcementId_userId_key" UNIQUE ("announcementId", "userId"),
    CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AnnouncementRead_userId_idx" ON "AnnouncementRead"("userId");
CREATE INDEX "AnnouncementRead_announcementId_idx" ON "AnnouncementRead"("announcementId");

INSERT INTO "AnnouncementRead" ("id", "announcementId", "userId", "readAt")
SELECT gen_random_uuid()::text, "announcementId", "userId", "read_at"
FROM "AnnouncementRead_old";

DROP TABLE "AnnouncementRead_old";
