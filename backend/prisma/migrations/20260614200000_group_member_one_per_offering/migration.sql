-- One study-group membership per student per course offering.
ALTER TABLE "GroupMember" ADD COLUMN "courseOfferingId" INTEGER;

UPDATE "GroupMember" gm
SET "courseOfferingId" = cg."courseOfferingId"
FROM "CourseGroup" cg
WHERE gm."groupId" = cg.id;

-- Keep one row per student per offering (lowest id wins).
DELETE FROM "GroupMember" a
USING "GroupMember" b
WHERE a."memberId" = b."memberId"
  AND a."courseOfferingId" = b."courseOfferingId"
  AND a.id > b.id;

ALTER TABLE "GroupMember" ALTER COLUMN "courseOfferingId" SET NOT NULL;

ALTER TABLE "GroupMember"
  ADD CONSTRAINT "GroupMember_courseOfferingId_fkey"
  FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "GroupMember_memberId_courseOfferingId_key"
  ON "GroupMember"("memberId", "courseOfferingId");

ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_groupId_fkey";
ALTER TABLE "GroupMember"
  ADD CONSTRAINT "GroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "CourseGroup"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
