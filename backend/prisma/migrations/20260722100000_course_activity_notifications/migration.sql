-- Course activity notifications (in-app feed for course content updates)
CREATE TYPE "CourseActivityKind" AS ENUM (
  'ASSIGNMENT_PUBLISHED',
  'ASSIGNMENT_UPDATED',
  'QUIZ_PUBLISHED',
  'RESOURCE_PUBLISHED',
  'FEED_POST'
);

CREATE TABLE "CourseActivityNotification" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "courseOfferingId" INTEGER,
  "kind" "CourseActivityKind" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "CourseActivityNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CourseActivityNotification_courseOfferingId_fkey"
    FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CourseActivityNotification_userId_readAt_idx"
  ON "CourseActivityNotification"("userId", "readAt");
CREATE INDEX "CourseActivityNotification_userId_createdAt_idx"
  ON "CourseActivityNotification"("userId", "createdAt");
CREATE INDEX "CourseActivityNotification_courseOfferingId_createdAt_idx"
  ON "CourseActivityNotification"("courseOfferingId", "createdAt");
