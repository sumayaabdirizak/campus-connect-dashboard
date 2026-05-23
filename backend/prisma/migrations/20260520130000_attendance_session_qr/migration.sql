-- CreateTable: AttendanceSession (live QR window opened by a teacher)
CREATE TABLE "AttendanceSession" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "startedById" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "tokenSeed" VARCHAR(64) NOT NULL,
    "geofenceLat" DOUBLE PRECISION,
    "geofenceLon" DOUBLE PRECISION,
    "geofenceRadius" INTEGER,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttendanceSession_scheduleId_idx" ON "AttendanceSession"("scheduleId");
CREATE INDEX "AttendanceSession_startedById_idx" ON "AttendanceSession"("startedById");

ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_scheduleId_fkey"
  FOREIGN KEY ("scheduleId") REFERENCES "ClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_startedById_fkey"
  FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
