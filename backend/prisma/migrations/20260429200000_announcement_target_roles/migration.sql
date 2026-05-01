-- Optional audience filter: empty array = all roles.
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
