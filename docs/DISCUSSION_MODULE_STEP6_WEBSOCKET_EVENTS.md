# Discussion Module - Step 6 WebSocket Events

Realtime event flow is implemented in `backend/src/server.js` on top of existing Socket.IO setup.

## Connection and auth

- Socket auth token is validated in `io.use(...)` middleware.
- On connect:
  - user is registered in `DiscussionSession`
  - user joins personal room `user:<id>`
  - previous discussion rooms are auto-joined from in-memory remembered rooms (reconnect support)

## Client -> Server events

- `join:group`
  - validates active membership
  - joins `discussion:group:<groupId>`
  - remembers group for reconnect
- `leave:group`
  - leaves discussion room
- `message:send`
  - validates membership + posting permission
  - stores message and links pending attachments
  - creates notifications for offline/inactive recipients
- `typing:start`
- `typing:stop`
- `message:read`
  - writes read receipt
  - marks notifications read for group
- `presence:ping`
  - updates `DiscussionSession.lastSeenAt`

## Server -> Client events

- `group:joined`
- `message:new`
- `typing:update`
- `message:read:update`
- `presence:update`

Compatibility event:

- `discussion:message:new` is also emitted for clients still listening to prefixed event names.

## Reliability behavior

- WebSocket failure fallback remains available via REST send endpoint:
  - `POST /api/discussions/groups/:groupId/messages`
- Reconnect:
  - client reconnects automatically via socket.io
  - server auto-joins previously remembered discussion rooms
- Missed data:
  - history is loaded through REST:
    - `GET /api/discussions/groups/:groupId/messages`

## Presence model

- Presence is considered active if a `DiscussionSession` has:
  - `disconnectedAt = null`
  - `lastSeenAt` within active window
- On disconnect:
  - session is marked with `disconnectedAt`
  - `presence:update` with `offline` is emitted to joined groups
