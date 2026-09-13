-- Remove support offices feature and legacy office roles.

-- Reassign users on removed roles to SUPER_ADMIN (ACADEMIC_OFFICE) or TEACHER (OFFICE_STAFF).
UPDATE "User" u
SET "roleId" = sa.id
FROM "Role" sa
WHERE u."roleId" IN (
  SELECT r.id FROM "Role" r WHERE r.name IN ('ACADEMIC_OFFICE', 'OFFICE_STAFF')
)
AND sa.name = 'SUPER_ADMIN';

-- Drop office-linked messages, then remove FK columns before dropping office tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DiscussionMessage'
      AND column_name = 'officeThreadId'
  ) THEN
    DELETE FROM "DiscussionMessage" WHERE "officeThreadId" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE "DiscussionMessage" DROP COLUMN IF EXISTS "officeThreadId";
ALTER TABLE "DiscussionMessage" DROP COLUMN IF EXISTS "isInternalNote";

DROP TABLE IF EXISTS "OfficeThreadRead";
DROP TABLE IF EXISTS "OfficeThread";
DROP TABLE IF EXISTS "SupportOfficeStaff";
DROP TABLE IF EXISTS "SupportOffice";

DROP TYPE IF EXISTS "OfficeThreadStatus";
DROP TYPE IF EXISTS "SupportOfficeStaffRole";

DELETE FROM "Role" WHERE name IN ('ACADEMIC_OFFICE', 'OFFICE_STAFF');
