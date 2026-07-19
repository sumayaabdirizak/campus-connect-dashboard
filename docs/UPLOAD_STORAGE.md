# Upload storage

## Today (default)

`STORAGE_DRIVER=local` (default). Files land under `backend/uploads/`:

| Prefix | Used by |
|--------|---------|
| `resources/` | Course resources |
| `discussions/` | Discussion attachments |
| `assignments/` | Assignment teacher attachments |
| `submissions/` | Student submission files |
| `chat/` | Course chat attachments |
| `course-feed/` | Course feed post attachments |
| `announcements/` | Announcement images |
| `covers/` | Course cover images |

Express serves `/uploads` with `Content-Disposition: attachment` for non-images. When `STORAGE_DRIVER=s3`, missing local files fall through to a signed redirect / stream from the bucket (same URL path).

**Limitation of local-only:** does not scale across multiple API replicas.

## Object storage (S3 / MinIO / R2)

Set:

```env
STORAGE_DRIVER=s3
S3_BUCKET=campus-connect
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
# S3_SIGNED_URL_TTL_SECONDS=900
```

Then create the bucket once:

```bash
cd backend
npm run storage:ensure-bucket
```

Local MinIO via Compose:

```bash
docker compose --profile storage up -d minio
# point STORAGE_* at http://localhost:9000 (host) or http://minio:9000 (from the backend container)
```

### Behaviour

1. Multer still lands on disk temporarily (content sniff / virus stub).
2. `commitUploadedFile` puts the object under `{prefix}/{random}.{ext}` and removes the temp file when using S3.
3. DB keeps `/uploads/{prefix}/…` URLs so existing `<img>` / Next rewrites work.
4. `/uploads` serves local files, then falls back to object storage.
5. Authz-heavy downloads (discussion tokens, resource RBAC, assignment download) still go through their API routes.

### Wired (Phases 5–6)

All major upload prefixes listed above go through `backend/src/storage/objectStorage.js`.

## Production checklist

1. Private bucket (no public ACL).
2. Keep extension allowlist + `file-type` sniff before `PutObject`.
3. Never trust client-supplied paths; only store server-generated keys.
4. Prefer dedicated IAM / MinIO policy limited to this bucket.
