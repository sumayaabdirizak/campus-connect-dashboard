-- AnnouncementRead: String id (cuid), readAt column, compound unique + indexes on FKs.

ALTER TABLE "AnnouncementRead" RENAME TO "AnnouncementRead_old";

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
