# Discussion Module - Step 2 Advanced Data Model

This document defines the advanced database data model for discussion groups.

## Goal

Support:

- Auto-created groups
- Role-based permissions
- Chat history and media
- Read receipts
- Notifications
- High-traffic scalability

## Core entities

### 1) DiscussionGroup

- `id`
- `scopeType` (`FACULTY | DEPARTMENT | BATCH | SECTION`)
- `scopeId`
- `groupKey` (`faculty:<id>`, `department:<id>`, `batch:<id>`, `section:<id>`)
- `name`
- `status` (`ACTIVE | ARCHIVED`)
- `createdAt`
- `archivedAt`

Rules:

- Unique by `(scopeType, scopeId)`
- Auto-created by system

### 2) DiscussionGroupMembership

- `id`
- `groupId`
- `userId`
- `role` (`STUDENT | LECTURER | HEAD | DEAN | ADMIN | ADVISOR`)
- `canPost`
- `canModerate`
- `joinedAt`
- `leftAt`

Rules:

- Auto-assigned from academic structure
- Unique by `(groupId, userId)`

### 3) DiscussionMessage

- `id`
- `groupId`
- `senderId`
- `content`
- `messageType` (`TEXT | MEDIA | SYSTEM`)
- `createdAt`
- `editedAt`
- `deletedAt`
- `parentMessageId` (threaded replies)

E2EE-ready optional fields:

- `keyVersion`
- `nonce`
- `ciphertext`
- `senderDeviceId`

### 4) DiscussionAttachment

- `id`
- `messageId`
- `url`
- `fileType` (`IMAGE | VIDEO | FILE`)
- `mimeType`
- `size`
- `createdAt`

Blob/E2EE-ready optional fields:

- `storageKey`
- `keyVersion`
- `nonce`
- `ciphertextHash`

### 5) DiscussionReadReceipt

- `id`
- `messageId`
- `userId`
- `readAt`

Rules:

- Unique by `(messageId, userId)`

### 6) DiscussionNotification

- `id`
- `userId`
- `groupId`
- `messageId`
- `type` (`MESSAGE | MENTION | ADMIN_ANNOUNCEMENT`)
- `payload` (JSON)
- `createdAt`
- `readAt`
- `deliveredAt`

### 7) DiscussionSession

- `id`
- `userId`
- `socketId`
- `serverId`
- `connectedAt`
- `lastSeenAt`
- `disconnectedAt`

## Optional advanced extensions

- `DiscussionMuteSetting` (`userId`, `groupId`, `until`)
- `DiscussionPinnedMessage`
- `DiscussionMessageReaction`
- Threaded replies via `DiscussionMessage.parentMessageId`

## Performance indexes

Required:

- `DiscussionMessage(groupId, createdAt)`
- `DiscussionGroupMembership(groupId, userId)` unique
- `DiscussionNotification(userId, readAt)`
- `DiscussionReadReceipt(messageId, userId)` unique

Additional scale indexes included:

- Sender and thread traversal indexes on messages
- Presence lookup indexes for sessions
- Group and message indexes for pin/reaction/mute operations

## Source of truth

Implemented in Prisma schema:

- `backend/prisma/schema.prisma`
