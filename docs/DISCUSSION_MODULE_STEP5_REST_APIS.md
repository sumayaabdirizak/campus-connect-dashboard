# Discussion Module - Step 5 REST APIs

Implemented REST endpoints under `/api/discussions`.

## Endpoints

### 1) List my groups

- `GET /api/discussions/me/groups`
- Returns active groups for current user with:
  - membership permissions
  - last message preview
  - unread count (from `DiscussionNotification`)

### 2) Get group message history

- `GET /api/discussions/groups/:groupId/messages?cursor=<opaque>&limit=<n>`
- Requires active membership.
- Cursor-based pagination using `(createdAt,id)`.
- Returns messages with sender + attachments.

### 3) Upload media

- `POST /api/discussions/uploads`
- `multipart/form-data`, field `file`, plus `groupId`.
- Validates membership, file type/size, and upload rate limits.
- Persists pending attachment metadata (`status=PENDING`) before message send.

### 4) Send message fallback (HTTP)

- `POST /api/discussions/groups/:groupId/messages`
- Body:
  - `content` (optional if attachments present)
  - `messageType` (`TEXT | MEDIA | SYSTEM`)
  - `attachmentIds` (optional)
- Validates membership + `canPost`.
- Links pending attachments to message and marks them `LINKED`.
- Creates per-recipient notifications.

### 5) Mark notifications read

- `PATCH /api/discussions/me/notifications/read`
- Supports:
  - `notificationIds[]`
  - `groupId`
  - `markAll=true`
  - `upToCreatedAt`
- Updates `readAt` for matching unread notifications.

## Security

- Auth required on all routes (`/api` auth gate in app middleware).
- Membership check required for group-scoped operations.
- Upload MIME and file-size validation.
- Upload rate limiting (in-memory windowed limiter).

## Performance

- Cursor pagination for history.
- Group list returns only latest message per group.
- Schema indexes used:
  - `DiscussionMessage(groupId, createdAt)`
  - `DiscussionNotification(userId, readAt)`
  - membership indexes on user/group activity

## Files

- `backend/src/controllers/discussions/discussions.js`
- `backend/src/app.js` (route registration)
