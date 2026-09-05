-- Auth + announcement columns present in schema.prisma but missing from earlier migrations.

CREATE TABLE IF NOT EXISTS "UserRole" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserRole_userId_fkey') THEN
    ALTER TABLE "UserRole"
      ADD CONSTRAINT "UserRole_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserRole_roleId_fkey') THEN
    ALTER TABLE "UserRole"
      ADD CONSTRAINT "UserRole_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "RevokedToken" (
    "jti" TEXT NOT NULL,
    "userId" INTEGER,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX IF NOT EXISTS "RevokedToken_userId_idx" ON "RevokedToken"("userId");
CREATE INDEX IF NOT EXISTS "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");

CREATE TABLE IF NOT EXISTS "UserLoginLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "UserLoginLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserLoginLog_userId_loginAt_idx" ON "UserLoginLog"("userId", "loginAt");
CREATE INDEX IF NOT EXISTS "UserLoginLog_loginAt_idx" ON "UserLoginLog"("loginAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserLoginLog_userId_fkey') THEN
    ALTER TABLE "UserLoginLog"
      ADD CONSTRAINT "UserLoginLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");
