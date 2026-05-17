# Discussion Module - Step 10 Reliability and Scale

This step adds production reliability scaffolding for high concurrency and horizontal scale.

## 1) Session and presence

Implemented:

- Redis-backed presence/session store with graceful fallback:
  - `backend/src/features/discussions/reliability/presenceStore.js`
- Sessions are tracked in both:
  - Redis (live, TTL-based)
  - DB `DiscussionSession` (durable audit)
- Stale sessions are auto-removed via Redis key expiry.

## 2) Message fan-out reliability

Implemented:

- Fan-out queue abstraction with bounded retries:
  - `backend/src/features/discussions/reliability/fanout.js`
- Tracks:
  - success/failure
  - retry count
  - dropped events after max retries

## 3) WebSocket scale-out

Implemented:

- Optional Socket.IO Redis adapter bootstrap in `server.js`.
- Activated when `REDIS_URL` is configured.
- Supports horizontal WS servers and cross-node room broadcasts.

Operational note:

- Keep sticky sessions at load balancer level for best client affinity.

## 4) Data growth strategy

Implemented maintenance endpoints under `/api/discussions`:

- `POST /maintenance/messages/archive-old`
  - exports old messages to JSONL archive file
  - redacts hot-store message body/cipher fields
  - preserves searchable metadata in main DB
- `POST /maintenance/attachments/archive-old`
- `POST /maintenance/attachments/cleanup-orphans`
- `POST /maintenance/notifications/archive`

Defaults:

- message archive threshold: minimum 12 months
- notification retention: 30-90 day bounded policy

## 5) Monitoring and observability

Implemented in-memory metric collector:

- `backend/src/features/discussions/reliability/metrics.js`
- counters and timer snapshots for:
  - send latency
  - fan-out delivery success/failures/retries/drops
  - notification pending/unread updates
  - archive runs

Metrics endpoint:

- `GET /api/discussions/metrics` (SUPER_ADMIN)

## Environment knobs

- `REDIS_URL`
- `DISCUSSION_SESSION_TTL_SECONDS`
- `DISCUSSION_ACTIVE_WINDOW_MS`
- `DISCUSSION_FANOUT_MAX_RETRIES`
- `DISCUSSION_FANOUT_RETRY_DELAY_MS`
- `DISCUSSION_NOTIFICATION_RETENTION_DAYS`

## Files touched

- `backend/src/server.js`
- `backend/src/controllers/discussions/discussions.js`
- `backend/src/features/discussions/reliability/metrics.js`
- `backend/src/features/discussions/reliability/presenceStore.js`
- `backend/src/features/discussions/reliability/fanout.js`
