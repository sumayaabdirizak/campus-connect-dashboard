-- Session bust: incrementing tokenVersion invalidates all outstanding JWTs for a user.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
