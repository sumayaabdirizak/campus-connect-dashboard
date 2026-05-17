-- Clubs feature — schema additions.
-- Adds:
--   * 6 enums (ClubStatus, ClubJoinPolicy, ClubScopeKind, ClubJoinRequestStatus,
--     ClubInviteStatus, ClubModerationAction)
--   * 7 tables (Club, InterestTag, ClubInterest, UserInterest, ClubJoinRequest,
--     ClubInvite, ClubModerationAudit, ClubQuotaPolicy)
--   * 7 new values on DiscussionNotificationType
--   * CLUB value on DiscussionScopeType (lets a club's DiscussionGroup get
--     scopeType=CLUB, scopeId=Club.id without colliding with faculty scopes)
--   * Partial unique index that race-protects the per-user "1 pending" quota.
--
-- All additive; no existing table is modified destructively. Re-runnable via
-- IF NOT EXISTS / IF NOT EXISTS-style guards where Postgres allows them.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enum additions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE "DiscussionScopeType" ADD VALUE IF NOT EXISTS 'CLUB';

ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_APPROVED';
ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_REJECTED';
ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_JOIN_REQUEST';
ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_JOIN_DECIDED';
ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_INVITE';
ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_PROMOTED';
ALTER TYPE "DiscussionNotificationType" ADD VALUE IF NOT EXISTS 'CLUB_REMOVED';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. New enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ClubStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubJoinPolicy" AS ENUM ('OPEN', 'BY_REQUEST', 'INVITE_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubScopeKind" AS ENUM ('FACULTY', 'UNIVERSITY', 'CROSS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ClubModerationAction" AS ENUM (
    'CREATE', 'APPROVE', 'REJECT', 'SUSPEND', 'ARCHIVE', 'EDIT', 'TRANSFER',
    'PROMOTE', 'DEMOTE', 'REMOVE_MEMBER', 'REVOKE_INVITE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. InterestTag (vocabulary) — created first so Club FKs resolve
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InterestTag" (
  "id"        SERIAL       PRIMARY KEY,
  "slug"      TEXT         NOT NULL UNIQUE,
  "label"     TEXT         NOT NULL,
  "category"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Club
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Club" (
  "id"               SERIAL              PRIMARY KEY,
  "slug"             TEXT                NOT NULL UNIQUE,
  "name"             TEXT                NOT NULL,
  "tagline"          VARCHAR(160),
  "description"      TEXT,
  "rules"            TEXT,
  "bannerUrl"        TEXT,
  "iconUrl"          TEXT,
  "themeColor"       VARCHAR(16),
  "status"           "ClubStatus"        NOT NULL DEFAULT 'PENDING',
  "joinPolicy"       "ClubJoinPolicy"    NOT NULL DEFAULT 'BY_REQUEST',
  "scopeKind"        "ClubScopeKind"     NOT NULL DEFAULT 'FACULTY',
  "facultyId"        INTEGER,
  "ownerId"          INTEGER,
  "isOfficial"       BOOLEAN             NOT NULL DEFAULT false,
  "memberCountCache" INTEGER             NOT NULL DEFAULT 0,
  "lastActivityAt"   TIMESTAMP(3),
  "serverId"         INTEGER             UNIQUE,
  "createdAt"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"        TIMESTAMP(3),
  "decidedByUserId"  INTEGER,

  CONSTRAINT "Club_facultyId_fkey"      FOREIGN KEY ("facultyId")
    REFERENCES "Faculty"("id")           ON DELETE SET NULL,
  CONSTRAINT "Club_ownerId_fkey"        FOREIGN KEY ("ownerId")
    REFERENCES "User"("id")              ON DELETE SET NULL,
  CONSTRAINT "Club_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId")
    REFERENCES "User"("id")              ON DELETE SET NULL,
  CONSTRAINT "Club_serverId_fkey"       FOREIGN KEY ("serverId")
    REFERENCES "DiscussionGroup"("id")   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "Club_status_idx"             ON "Club"("status");
CREATE INDEX IF NOT EXISTS "Club_scopeKind_status_idx"   ON "Club"("scopeKind", "status");
CREATE INDEX IF NOT EXISTS "Club_facultyId_status_idx"   ON "Club"("facultyId", "status");
CREATE INDEX IF NOT EXISTS "Club_ownerId_status_idx"     ON "Club"("ownerId", "status");
CREATE INDEX IF NOT EXISTS "Club_lastActivityAt_idx"     ON "Club"("lastActivityAt");

-- Race-proof the "1 pending application per user" rule. The 2-active rule is
-- enforced in the application code via transaction + count; only PENDING is
-- vulnerable enough to deserve an index-level guard.
CREATE UNIQUE INDEX IF NOT EXISTS "Club_owner_pending_unique"
  ON "Club"("ownerId")
  WHERE "status" = 'PENDING' AND "ownerId" IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ClubInterest (M:M Club ↔ InterestTag)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClubInterest" (
  "clubId" INTEGER NOT NULL,
  "tagId"  INTEGER NOT NULL,

  PRIMARY KEY ("clubId", "tagId"),

  CONSTRAINT "ClubInterest_clubId_fkey" FOREIGN KEY ("clubId")
    REFERENCES "Club"("id")              ON DELETE CASCADE,
  CONSTRAINT "ClubInterest_tagId_fkey"  FOREIGN KEY ("tagId")
    REFERENCES "InterestTag"("id")       ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClubInterest_tagId_idx" ON "ClubInterest"("tagId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. UserInterest (M:M User ↔ InterestTag) — drives recommendations
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "UserInterest" (
  "userId"   INTEGER      NOT NULL,
  "tagId"    INTEGER      NOT NULL,
  "pickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY ("userId", "tagId"),

  CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id")              ON DELETE CASCADE,
  CONSTRAINT "UserInterest_tagId_fkey"  FOREIGN KEY ("tagId")
    REFERENCES "InterestTag"("id")       ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserInterest_tagId_idx" ON "UserInterest"("tagId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ClubJoinRequest
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClubJoinRequest" (
  "id"              SERIAL                  PRIMARY KEY,
  "clubId"          INTEGER                 NOT NULL,
  "userId"          INTEGER                 NOT NULL,
  "status"          "ClubJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason"          VARCHAR(500),
  "requestedAt"     TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"       TIMESTAMP(3),
  "decidedByUserId" INTEGER,
  "decideReason"    VARCHAR(500),

  CONSTRAINT "ClubJoinRequest_clubId_fkey"          FOREIGN KEY ("clubId")
    REFERENCES "Club"("id")                          ON DELETE CASCADE,
  CONSTRAINT "ClubJoinRequest_userId_fkey"          FOREIGN KEY ("userId")
    REFERENCES "User"("id")                          ON DELETE CASCADE,
  CONSTRAINT "ClubJoinRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId")
    REFERENCES "User"("id")                          ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ClubJoinRequest_clubId_status_idx"   ON "ClubJoinRequest"("clubId", "status");
CREATE INDEX IF NOT EXISTS "ClubJoinRequest_userId_status_idx"   ON "ClubJoinRequest"("userId", "status");

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ClubInvite (direct user, token link, or cross-server channel invite)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClubInvite" (
  "id"            SERIAL              PRIMARY KEY,
  "clubId"        INTEGER             NOT NULL,
  "inviterUserId" INTEGER             NOT NULL,
  "inviteeUserId" INTEGER,
  "channelId"     INTEGER,
  "token"         TEXT                NOT NULL UNIQUE,
  "status"        "ClubInviteStatus"  NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"     TIMESTAMP(3),
  "usedAt"        TIMESTAMP(3),
  "revokedAt"     TIMESTAMP(3),

  CONSTRAINT "ClubInvite_clubId_fkey"        FOREIGN KEY ("clubId")
    REFERENCES "Club"("id")                   ON DELETE CASCADE,
  CONSTRAINT "ClubInvite_inviterUserId_fkey" FOREIGN KEY ("inviterUserId")
    REFERENCES "User"("id")                   ON DELETE CASCADE,
  CONSTRAINT "ClubInvite_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId")
    REFERENCES "User"("id")                   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ClubInvite_clubId_status_idx"           ON "ClubInvite"("clubId", "status");
CREATE INDEX IF NOT EXISTS "ClubInvite_inviterUserId_idx"           ON "ClubInvite"("inviterUserId");
CREATE INDEX IF NOT EXISTS "ClubInvite_inviteeUserId_status_idx"    ON "ClubInvite"("inviteeUserId", "status");

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. ClubModerationAudit
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClubModerationAudit" (
  "id"          SERIAL                  PRIMARY KEY,
  "clubId"      INTEGER                 NOT NULL,
  "actorUserId" INTEGER,
  "action"      "ClubModerationAction"  NOT NULL,
  "reason"      VARCHAR(500),
  "payload"     JSONB,
  "createdAt"   TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClubModerationAudit_clubId_fkey"      FOREIGN KEY ("clubId")
    REFERENCES "Club"("id")                          ON DELETE CASCADE,
  CONSTRAINT "ClubModerationAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId")
    REFERENCES "User"("id")                          ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ClubModerationAudit_clubId_createdAt_idx" ON "ClubModerationAudit"("clubId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClubModerationAudit_actorUserId_idx"      ON "ClubModerationAudit"("actorUserId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ClubQuotaPolicy (singleton)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClubQuotaPolicy" (
  "id"                SERIAL       PRIMARY KEY,
  "perUserActiveCap"  INTEGER      NOT NULL DEFAULT 2,
  "perUserPendingCap" INTEGER      NOT NULL DEFAULT 1,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed singleton row; seed.js can overwrite if knobs change.
INSERT INTO "ClubQuotaPolicy" ("id", "perUserActiveCap", "perUserPendingCap", "updatedAt")
  VALUES (1, 2, 1, CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO NOTHING;

COMMIT;
