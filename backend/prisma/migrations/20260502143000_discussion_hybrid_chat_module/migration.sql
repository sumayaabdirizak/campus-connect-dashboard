-- Discussion + hybrid chat (align DB with Prisma; missing from earlier migrations)

DO $$ BEGIN CREATE TYPE "DiscussionScopeType" AS ENUM ('FACULTY', 'DEPARTMENT', 'BATCH', 'SECTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionMembershipRole" AS ENUM ('STUDENT', 'LECTURER', 'HEAD', 'DEAN', 'ADMIN', 'ADVISOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionMessageType" AS ENUM ('TEXT', 'MEDIA', 'SYSTEM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionAttachmentType" AS ENUM ('IMAGE', 'VIDEO', 'FILE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionNotificationType" AS ENUM ('MESSAGE', 'MENTION', 'ADMIN_ANNOUNCEMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionGroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionServerKind" AS ENUM ('SCOPE_GROUP', 'FACULTY_SERVER', 'USER_SERVER', 'DEPARTMENT_LEGACY', 'BATCH_LEGACY', 'SECTION_LEGACY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionChannelKind" AS ENUM ('TEXT', 'ANNOUNCEMENT', 'FORUM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "DiscussionOverwriteTarget" AS ENUM ('ROLE', 'MEMBER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "GroupDmMemberRole" AS ENUM ('OWNER', 'MEMBER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DiscussionGroup" (
    "id" SERIAL NOT NULL,
    "scopeType" "DiscussionScopeType" NOT NULL,
    "scopeId" INTEGER NOT NULL,
    "groupKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DiscussionGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "kind" "DiscussionServerKind" NOT NULL DEFAULT 'SCOPE_GROUP',
    "parentServerId" INTEGER,
    "ownerId" INTEGER,
    "iconUrl" TEXT,
    "description" TEXT,
    "defaultChannelId" INTEGER,
    "e2eeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "e2eeCurrentKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "e2eeRotationRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionGroup_pkey" PRIMARY KEY ("id")
);

-- Repair older "DiscussionGroup" tables missing hybrid columns (safe no-ops on fresh DBs)
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "kind" "DiscussionServerKind" NOT NULL DEFAULT 'SCOPE_GROUP';
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "parentServerId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "ownerId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "defaultChannelId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "e2eeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "e2eeCurrentKeyVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "e2eeRotationRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS "DiscussionGroup" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionChannelCategory" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "systemKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionChannelCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionChannel" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "DiscussionChannelKind" NOT NULL DEFAULT 'TEXT',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "topic" TEXT,
    "scopeType" "DiscussionScopeType",
    "scopeId" INTEGER,
    "legacyGroupId" INTEGER,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionRole" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "systemKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" BIGINT NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionPermissionOverwrite" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "targetType" "DiscussionOverwriteTarget" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "allow" BIGINT NOT NULL DEFAULT 0,
    "deny" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "DiscussionPermissionOverwrite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GroupDm" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "iconUrl" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "GroupDm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GroupDmMember" (
    "id" SERIAL NOT NULL,
    "groupDmId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "GroupDmMemberRole" NOT NULL DEFAULT 'MEMBER',
    "canPost" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "GroupDmMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionGroupMembership" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "DiscussionMembershipRole" NOT NULL,
    "canPost" BOOLEAN NOT NULL DEFAULT false,
    "canModerate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionMessage" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER,
    "channelId" INTEGER,
    "groupDmId" INTEGER,
    "senderId" INTEGER,
    "content" TEXT,
    "messageType" "DiscussionMessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "parentMessageId" INTEGER,
    "keyVersion" INTEGER,
    "nonce" TEXT,
    "ciphertext" TEXT,
    "senderDeviceId" TEXT,

    CONSTRAINT "DiscussionMessage_pkey" PRIMARY KEY ("id")
);

-- Repair older "DiscussionMessage" tables missing hybrid / DM columns (safe no-ops on fresh DBs)
ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "channelId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "groupDmId" INTEGER;
ALTER TABLE IF EXISTS "DiscussionMessage" ADD COLUMN IF NOT EXISTS "senderDeviceId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionAttachment" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER,
    "uploadedById" INTEGER NOT NULL,
    "groupId" INTEGER,
    "url" TEXT NOT NULL,
    "fileType" "DiscussionAttachmentType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageKey" TEXT,
    "keyVersion" INTEGER,
    "nonce" TEXT,
    "ciphertextHash" TEXT,

    CONSTRAINT "DiscussionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionReadReceipt" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionNotification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "messageId" INTEGER,
    "type" "DiscussionNotificationType" NOT NULL DEFAULT 'MESSAGE',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "socketId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionMuteSetting" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "until" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionMuteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionPinnedMessage" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "messageId" INTEGER NOT NULL,
    "pinnedById" INTEGER NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unpinnedAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionPinnedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionMessageReaction" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionMessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionDeviceKey" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'X25519',
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionDeviceKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscussionGroupKeyEnvelope" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'X25519_AES_GCM',
    "nonce" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionGroupKeyEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionGroup_groupKey_key" ON "DiscussionGroup"("groupKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionGroup_defaultChannelId_key" ON "DiscussionGroup"("defaultChannelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroup_status_idx" ON "DiscussionGroup"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroup_scopeType_scopeId_idx" ON "DiscussionGroup"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroup_kind_idx" ON "DiscussionGroup"("kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroup_parentServerId_idx" ON "DiscussionGroup"("parentServerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionGroup_scopeType_scopeId_key" ON "DiscussionGroup"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionChannelCategory_serverId_position_idx" ON "DiscussionChannelCategory"("serverId", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionChannelCategory_serverId_systemKey_key" ON "DiscussionChannelCategory"("serverId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionChannel_legacyGroupId_key" ON "DiscussionChannel"("legacyGroupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionChannel_serverId_position_idx" ON "DiscussionChannel"("serverId", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionChannel_serverId_archivedAt_idx" ON "DiscussionChannel"("serverId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionChannel_serverId_slug_key" ON "DiscussionChannel"("serverId", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionRole_serverId_position_idx" ON "DiscussionRole"("serverId", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionRole_serverId_systemKey_key" ON "DiscussionRole"("serverId", "systemKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionPermissionOverwrite_channelId_idx" ON "DiscussionPermissionOverwrite"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionPermissionOverwrite_channelId_targetType_targetId_key" ON "DiscussionPermissionOverwrite"("channelId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupDm_createdById_idx" ON "GroupDm"("createdById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupDm_archivedAt_idx" ON "GroupDm"("archivedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GroupDmMember_userId_leftAt_idx" ON "GroupDmMember"("userId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GroupDmMember_groupDmId_userId_key" ON "GroupDmMember"("groupDmId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroupMembership_groupId_userId_idx" ON "DiscussionGroupMembership"("groupId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroupMembership_groupId_isActive_idx" ON "DiscussionGroupMembership"("groupId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroupMembership_userId_leftAt_idx" ON "DiscussionGroupMembership"("userId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionGroupMembership_groupId_userId_key" ON "DiscussionGroupMembership"("groupId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessage_groupId_createdAt_idx" ON "DiscussionMessage"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessage_groupId_keyVersion_createdAt_idx" ON "DiscussionMessage"("groupId", "keyVersion", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessage_senderId_idx" ON "DiscussionMessage"("senderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessage_groupId_parentMessageId_createdAt_idx" ON "DiscussionMessage"("groupId", "parentMessageId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessage_channelId_createdAt_idx" ON "DiscussionMessage"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessage_groupDmId_createdAt_idx" ON "DiscussionMessage"("groupDmId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionAttachment_messageId_idx" ON "DiscussionAttachment"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionAttachment_uploadedById_status_idx" ON "DiscussionAttachment"("uploadedById", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionAttachment_groupId_createdAt_idx" ON "DiscussionAttachment"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionReadReceipt_messageId_userId_idx" ON "DiscussionReadReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionReadReceipt_userId_readAt_idx" ON "DiscussionReadReceipt"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionReadReceipt_messageId_userId_key" ON "DiscussionReadReceipt"("messageId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionNotification_userId_readAt_idx" ON "DiscussionNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionNotification_groupId_createdAt_idx" ON "DiscussionNotification"("groupId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionSession_socketId_key" ON "DiscussionSession"("socketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionSession_userId_lastSeenAt_idx" ON "DiscussionSession"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionSession_serverId_connectedAt_idx" ON "DiscussionSession"("serverId", "connectedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMuteSetting_groupId_idx" ON "DiscussionMuteSetting"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionMuteSetting_userId_groupId_key" ON "DiscussionMuteSetting"("userId", "groupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionPinnedMessage_groupId_pinnedAt_idx" ON "DiscussionPinnedMessage"("groupId", "pinnedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionPinnedMessage_messageId_idx" ON "DiscussionPinnedMessage"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessageReaction_messageId_idx" ON "DiscussionMessageReaction"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionMessageReaction_userId_idx" ON "DiscussionMessageReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionMessageReaction_messageId_userId_emoji_key" ON "DiscussionMessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionDeviceKey_userId_revokedAt_idx" ON "DiscussionDeviceKey"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionDeviceKey_userId_deviceId_key" ON "DiscussionDeviceKey"("userId", "deviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroupKeyEnvelope_groupId_keyVersion_idx" ON "DiscussionGroupKeyEnvelope"("groupId", "keyVersion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DiscussionGroupKeyEnvelope_userId_deviceId_idx" ON "DiscussionGroupKeyEnvelope"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscussionGroupKeyEnvelope_groupId_keyVersion_userId_device_key" ON "DiscussionGroupKeyEnvelope"("groupId", "keyVersion", "userId", "deviceId");

DO $$ BEGIN
  ALTER TABLE "DiscussionGroup" ADD CONSTRAINT "DiscussionGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroup" ADD CONSTRAINT "DiscussionGroup_parentServerId_fkey" FOREIGN KEY ("parentServerId") REFERENCES "DiscussionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroup" ADD CONSTRAINT "DiscussionGroup_defaultChannelId_fkey" FOREIGN KEY ("defaultChannelId") REFERENCES "DiscussionChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionChannelCategory" ADD CONSTRAINT "DiscussionChannelCategory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionChannel" ADD CONSTRAINT "DiscussionChannel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionChannel" ADD CONSTRAINT "DiscussionChannel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DiscussionChannelCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionRole" ADD CONSTRAINT "DiscussionRole_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionPermissionOverwrite" ADD CONSTRAINT "DiscussionPermissionOverwrite_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "DiscussionChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GroupDm" ADD CONSTRAINT "GroupDm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GroupDmMember" ADD CONSTRAINT "GroupDmMember_groupDmId_fkey" FOREIGN KEY ("groupDmId") REFERENCES "GroupDm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GroupDmMember" ADD CONSTRAINT "GroupDmMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroupMembership" ADD CONSTRAINT "DiscussionGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroupMembership" ADD CONSTRAINT "DiscussionGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "DiscussionChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_groupDmId_fkey" FOREIGN KEY ("groupDmId") REFERENCES "GroupDm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessage" ADD CONSTRAINT "DiscussionMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "DiscussionMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionAttachment" ADD CONSTRAINT "DiscussionAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DiscussionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionAttachment" ADD CONSTRAINT "DiscussionAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionAttachment" ADD CONSTRAINT "DiscussionAttachment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionReadReceipt" ADD CONSTRAINT "DiscussionReadReceipt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DiscussionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionReadReceipt" ADD CONSTRAINT "DiscussionReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionNotification" ADD CONSTRAINT "DiscussionNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionNotification" ADD CONSTRAINT "DiscussionNotification_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionNotification" ADD CONSTRAINT "DiscussionNotification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DiscussionMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionSession" ADD CONSTRAINT "DiscussionSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMuteSetting" ADD CONSTRAINT "DiscussionMuteSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMuteSetting" ADD CONSTRAINT "DiscussionMuteSetting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionPinnedMessage" ADD CONSTRAINT "DiscussionPinnedMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionPinnedMessage" ADD CONSTRAINT "DiscussionPinnedMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DiscussionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionPinnedMessage" ADD CONSTRAINT "DiscussionPinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessageReaction" ADD CONSTRAINT "DiscussionMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DiscussionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionMessageReaction" ADD CONSTRAINT "DiscussionMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionDeviceKey" ADD CONSTRAINT "DiscussionDeviceKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroupKeyEnvelope" ADD CONSTRAINT "DiscussionGroupKeyEnvelope_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DiscussionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroupKeyEnvelope" ADD CONSTRAINT "DiscussionGroupKeyEnvelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscussionGroupKeyEnvelope" ADD CONSTRAINT "DiscussionGroupKeyEnvelope_userId_deviceId_fkey" FOREIGN KEY ("userId", "deviceId") REFERENCES "DiscussionDeviceKey"("userId", "deviceId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

