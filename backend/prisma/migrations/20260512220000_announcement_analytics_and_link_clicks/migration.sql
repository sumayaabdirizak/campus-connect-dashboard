-- Analytics snapshots (nightly rollup) and link click CTR proxy.
-- AnnouncementLinkClick: optional userId for GDPR — null when click is anonymous / token had no user.

CREATE TABLE "AnnouncementAnalyticsSnapshot" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "uniqueReaders" INTEGER NOT NULL DEFAULT 0,
    "readRate" DOUBLE PRECISION,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedCount" INTEGER NOT NULL DEFAULT 0,
    "linkClicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnnouncementAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementAnalyticsSnapshot_announcementId_snapshotAt_key" ON "AnnouncementAnalyticsSnapshot"("announcementId", "snapshotAt");

CREATE INDEX "AnnouncementAnalyticsSnapshot_snapshotAt_idx" ON "AnnouncementAnalyticsSnapshot"("snapshotAt");

ALTER TABLE "AnnouncementAnalyticsSnapshot" ADD CONSTRAINT "AnnouncementAnalyticsSnapshot_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AnnouncementLinkClick" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER,
    "url" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementLinkClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnnouncementLinkClick_announcementId_clickedAt_idx" ON "AnnouncementLinkClick"("announcementId", "clickedAt");

CREATE INDEX "AnnouncementLinkClick_announcementId_userId_idx" ON "AnnouncementLinkClick"("announcementId", "userId");

ALTER TABLE "AnnouncementLinkClick" ADD CONSTRAINT "AnnouncementLinkClick_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementLinkClick" ADD CONSTRAINT "AnnouncementLinkClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
