# Discussion Module - Step 7 Notifications

Advanced notification behavior is implemented for realtime and REST paths.

## Goal

Notify users of new messages with popup and unread counts, including offline reliability.

## Creation rule

A notification is created when:

- a new discussion message is sent, and
- the recipient is not actively viewing that group.

Active viewing is tracked per-socket through `activeGroupId` (`presence:ping` and `join:group`).

## Delivery rules

- Online + not viewing group:
  - notification row is stored
  - `notification:new` popup event is emitted
  - `unread:update` is emitted
- Offline:
  - notification row is stored only
  - pending notifications + unread are emitted on reconnect
- Muted group:
  - notification is stored
  - popup is suppressed
  - unread count remains tracked

## Data stored

In `DiscussionNotification`:

- `userId`
- `messageId`
- `groupId`
- `type`
- `payload` (includes sender metadata)
- `createdAt`
- `readAt`
- `deliveredAt` (reserved)

## API support

Under `/api/discussions`:

- `GET /me/notifications`
- `GET /me/notifications/unread-count`
- `PATCH /me/notifications/read`

Maintenance:

- `POST /maintenance/notifications/archive` (SUPER_ADMIN)
  - archives old read notifications with retention window 30-90 days.

## Realtime events

- `notification:new`
- `unread:update`
- `notifications:pending` (on reconnect)

## Files

- `backend/src/server.js`
- `backend/src/controllers/discussions/discussions.js`
