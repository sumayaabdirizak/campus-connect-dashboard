# Announcements — Privacy & Retention Policy

Documents how the announcements module handles personal data under FERPA (US Family Educational Rights and Privacy Act) and GDPR (EU/UK General Data Protection Regulation). Pairs with the access controls described in [announcements-api.md](./announcements-api.md) and the accessibility notes in `frontend/docs/announcements-a11y.md`.

## Data inventory

| Table | Purpose | PII fields |
|---|---|---|
| `Announcement` | Broadcast content | `createdById` (the author) |
| `AnnouncementAudit` | Mutation history | `actorId` (nullable), `actorIdHash`, JSON snapshots of `before`/`after` |
| `AnnouncementRead` | Read receipts | `userId`, `readAt` |
| `AnnouncementAcknowledgement` | Required acknowledgements | `userId`, `acknowledgedAt` |
| `AnnouncementComment` | Comment threads (UI in Phase 3) | `authorId`, `bodyMarkdown` |
| `AnnouncementReaction` | Heart reactions | `userId` |
| `AnnouncementAttachment` | Uploaded files + alt text | `altText` (free-form) |
| `WebPushSubscription` | Push endpoints (used in Phase 2) | `userId`, `endpoint`, `p256dh`, `auth`, `userAgent` |

## Retention horizons

Both retention windows are configurable via env. Defaults are conservative.

| Record | Default | Env override | Why |
|---|---|---|---|
| `AnnouncementAudit` | 7 years | `ANNOUNCEMENT_AUDIT_RETENTION_DAYS` | FERPA student-record minimum is 5 years; we keep 7 to cover the longest US state requirements. |
| `AnnouncementRead` | ~13 months (390 days) | `ANNOUNCEMENT_READ_RETENTION_DAYS` | Spans one academic cycle; aligns with GDPR data-minimisation. |

`expiresAt` is populated on both tables when rows are written. A nightly Bull-MQ job (`announcement-retention`) purges rows where `expiresAt <= now`.

### Wiring the purge

The purge runs only when the scheduler is enabled (`ANNOUNCEMENTS_SCHEDULER=on` and `REDIS_URL` set). To bootstrap:

```js
import { scheduleRetentionPurge } from "./features/announcements/services/announcementRetention.service.js";
await scheduleRetentionPurge();
```

For one-shot purges (e.g. a maintenance script):

```js
import { purgeExpiredAnnouncementRecords } from "./features/announcements/services/announcementRetention.service.js";
await purgeExpiredAnnouncementRecords();
```

## Right to access (GDPR Art. 15)

Endpoint: `GET /announcements/me/data-export` (authenticated).

Returns a JSON document containing the requesting user's:

- Read receipts (`announcementId`, `readAt`, `expiresAt`)
- Acknowledgements
- Comments (including soft-deleted)
- Reactions
- Audit rows where the user was the actor

The response sets `Content-Disposition: attachment` so browsers offer a download.

## Right to erasure (GDPR Art. 17)

When a user is deleted, call:

```js
import { anonymizeAnnouncementAuditForUser } from "./features/announcements/services/announcementRetention.service.js";
await anonymizeAnnouncementAuditForUser(userId);
```

This sets `actorId` to NULL and stores an HMAC fingerprint in `actorIdHash` (secret: `ANNOUNCEMENT_AUDIT_HASH_SECRET`). Effects:

- The audit row is preserved for integrity (we still know *something* changed).
- The actor identity is removed; rows by the same erased user remain linkable to one another via the hash but cannot be reversed back to the user without the secret.
- Read receipts, acknowledgements, comments, and reactions cascade-delete via the existing `onDelete: Cascade` FKs when the User row is removed, so nothing manual is needed for those.

## Annual FERPA notice

Use the announcements module itself: at the start of each academic year, post a system-wide pinned announcement with `acknowledgementRequired: true` and `targetRoles: ["STUDENT", "TEACHER"]`. The `AnnouncementAcknowledgement` table then provides an audit trail showing each user accepted the notice. No new code is required.

## Breach record

When a breach occurs, attach the affected `announcementId` set + actor IDs to the institutional incident record. The `AnnouncementAudit` rows for those announcements give a full timeline of edits, deletions, and the personnel involved.

## Operational checklist

- [ ] `ANNOUNCEMENT_AUDIT_HASH_SECRET` is set in production (`openssl rand -hex 32`).
- [ ] Scheduler is on (`ANNOUNCEMENTS_SCHEDULER=on`, `REDIS_URL` configured).
- [ ] `scheduleRetentionPurge()` is called at server bootstrap.
- [ ] User-deletion flow calls `anonymizeAnnouncementAuditForUser()` before dropping the User row.
- [ ] Downstream backups also enforce retention; do not preserve purged rows in cold storage longer than the policy allows.
