-- Partial indexes for "soft-deleted / soft-archived" hot paths.
--
-- Prisma's @@index can't express WHERE clauses, so these are added via raw
-- SQL. They complement (don't replace) the full indexes already declared in
-- schema.prisma, and are dramatically smaller for queries that filter on the
-- partial predicate.
--
-- Created with IF NOT EXISTS so re-running the migration is idempotent.
-- We deliberately do NOT use CREATE INDEX CONCURRENTLY here because Prisma
-- migrations run inside a transaction. On large prod tables an operator can
-- run these statements manually with CONCURRENTLY off-hours instead.

-- 1. Active pins per server.
--    Query: SELECT * FROM "DiscussionPinnedMessage"
--           WHERE "groupId" = $1 AND "unpinnedAt" IS NULL
--           ORDER BY "pinnedAt" DESC LIMIT 50
--    The full @@index([groupId, pinnedAt]) walks every pin in the group
--    including all historical unpins. This partial index excludes them.
CREATE INDEX IF NOT EXISTS "DiscussionPinnedMessage_groupId_active_idx"
  ON "DiscussionPinnedMessage" ("groupId", "pinnedAt" DESC)
  WHERE "unpinnedAt" IS NULL;

-- 2. Unread notifications per user.
--    Hot queries (every page load):
--      - SELECT COUNT(*) FROM "DiscussionNotification"
--        WHERE "userId" = $1 AND "readAt" IS NULL
--      - groupBy "groupId" for the unread:update socket payload
--    Existing @@index([userId, readAt]) helps but still scans read rows.
--    Partial index lets the planner go straight to unread rows only.
CREATE INDEX IF NOT EXISTS "DiscussionNotification_userId_unread_idx"
  ON "DiscussionNotification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;

-- 3. Active channel messages by recency.
--    Query: SELECT * FROM "DiscussionMessage"
--           WHERE "channelId" = $1 AND "deletedAt" IS NULL
--             AND "parentMessageId" IS NULL
--           ORDER BY "createdAt" DESC, "id" DESC LIMIT 50
--    The composite @@index([channelId, parentMessageId, createdAt]) added
--    earlier already gets us most of the way; this partial index makes it
--    even smaller by excluding deleted rows entirely.
CREATE INDEX IF NOT EXISTS "DiscussionMessage_channelId_active_idx"
  ON "DiscussionMessage" ("channelId", "parentMessageId", "createdAt" DESC, "id" DESC)
  WHERE "deletedAt" IS NULL;

-- 4. Active group-DM messages by recency. Same logic as #3 but for DMs.
CREATE INDEX IF NOT EXISTS "DiscussionMessage_groupDmId_active_idx"
  ON "DiscussionMessage" ("groupDmId", "createdAt" DESC, "id" DESC)
  WHERE "deletedAt" IS NULL AND "groupDmId" IS NOT NULL;
