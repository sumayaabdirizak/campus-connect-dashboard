# Discussion Module - Step 8 Media Handling

Advanced media handling is implemented for discussion chat uploads and attachment access.

## Upload flow

1. Client uploads with `POST /api/discussions/uploads` using multipart form data.
2. Server validates:
   - membership (`groupId` required)
   - type (image/video/file categories)
   - size limit by type
   - upload rate limit
   - optional virus scan hook (mode controlled by env)
3. File is stored on server storage (`uploads/discussions`).
4. Attachment metadata row is created with `PENDING` status.
5. API returns attachment metadata + secure `accessUrl`.

## Attachment metadata

Returned metadata includes:

- `url`
- `accessUrl` (signed, short-lived)
- `fileType` (`IMAGE` / `VIDEO` / `FILE`)
- `mimeType`
- `size`
- `createdAt`

## Message link

- `POST /api/discussions/groups/:groupId/messages` accepts `attachmentIds`.
- Server links pending attachments to new message and marks status `LINKED`.
- History API returns message attachments with signed `accessUrl`.

## Security rules

- Per-type size limits:
  - image: 10MB
  - video: 100MB
  - file: 25MB
- Upload rate limiting per user.
- Optional virus scan hook:
  - `DISCUSSION_VIRUS_SCAN_MODE=off|warn|block`
- Secure/private delivery via signed token URLs:
  - `GET /api/discussions/attachments/:id/access-url`
  - `GET /api/discussions/attachments/:id/download?token=...`

## Cleanup

Maintenance endpoints:

- `POST /api/discussions/maintenance/attachments/cleanup-orphans`
  - removes stale pending attachments and deletes physical files.
- `POST /api/discussions/maintenance/attachments/archive-old`
  - marks older linked media as `ARCHIVED`.

## Files

- `backend/src/controllers/discussions/discussions.js`
