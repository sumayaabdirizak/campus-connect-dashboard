-- Calendar deadline reminder dedupe (T-24h / T-1h), see `calendarDeadlineReminder.service.js`.

CREATE TYPE "CalendarReminderPhase" AS ENUM ('T24H', 'T1H');

CREATE TABLE "CalendarReminderJob" (
    "id" TEXT NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "phase" "CalendarReminderPhase" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarReminderJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarReminderJob_announcementId_phase_key" ON "CalendarReminderJob"("announcementId", "phase");

CREATE INDEX "CalendarReminderJob_announcementId_idx" ON "CalendarReminderJob"("announcementId");

ALTER TABLE "CalendarReminderJob" ADD CONSTRAINT "CalendarReminderJob_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
