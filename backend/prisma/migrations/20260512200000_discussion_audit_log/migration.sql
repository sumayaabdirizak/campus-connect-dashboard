-- A11: Discussion audit log (append-only channel/server moderation history)
CREATE TABLE "DiscussionAuditLog" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "channelId" INTEGER,
    "actorUserId" INTEGER NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(32) NOT NULL,
    "targetId" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiscussionAuditLog_serverId_createdAt_id_idx" ON "DiscussionAuditLog"("serverId", "createdAt", "id");
CREATE INDEX "DiscussionAuditLog_channelId_createdAt_id_idx" ON "DiscussionAuditLog"("channelId", "createdAt", "id");

ALTER TABLE "DiscussionAuditLog" ADD CONSTRAINT "DiscussionAuditLog_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionAuditLog" ADD CONSTRAINT "DiscussionAuditLog_channelId_fkey"
  FOREIGN KEY ("channelId") REFERENCES "DiscussionChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscussionAuditLog" ADD CONSTRAINT "DiscussionAuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
