# Security — Campus Connect (living doc)

Last updated: 2026-07-14. Replaces outdated narrative in the archived May 2026 audit.

## Current posture (summary)

| Control | Status |
|---------|--------|
| httpOnly JWT + refresh rotation | ✅ |
| jti deny-list on HTTP + Socket.IO | ✅ |
| `tokenVersion` session bust (`revokeAllForUser`) | ✅ |
| CSRF double-submit | ✅ |
| Helmet | ✅ |
| Course offering RBAC / publicId UUID | ✅ |
| Upload: extension allowlist + magic sniff | ✅ (resources + discussions) |
| Login + refresh rate limits | ✅ |
| `TRUST_PROXY` (opt-in) | ✅ set when behind reverse proxy |
| Object storage for uploads | ✅ opt-in `STORAGE_DRIVER=s3` (all major upload prefixes) |

## Operator checklist

1. `JWT_SECRET` ≥ 32 chars in production; set `CORS_ORIGINS` / `FRONTEND_URL`.
2. Set `TRUST_PROXY=1` behind nginx/Cloudflare.
3. Prefer dedicated signing secrets (`DISCUSSION_ATTACHMENT_SIGNING_SECRET`, `ANNOUNCEMENT_AUDIT_HASH_SECRET`, …).
4. Expired `RevokedToken` rows are purged on an in-process timer (every 6h; override with `TOKEN_CLEAN_INTERVAL_MS`, or `0` to disable). Manual: `npm run tokens:clean`.
5. For multi-instance deploys set `STORAGE_DRIVER=s3` (see [UPLOAD_STORAGE.md](./UPLOAD_STORAGE.md)).
6. Enable Sentry via `NEXT_PUBLIC_SENTRY_DSN` when ready.

## Auth endpoints

| Method | Path | Notes |
|--------|------|------|
| POST | `/api/auth/login` | Public; issues cookies + CSRF |
| POST | `/api/auth/refresh` | Public; rotates refresh jti |
| POST | `/api/auth/logout` | CSRF required; revokes jtis; clears cookies |
| GET | `/api/auth/csrf` | Issues CSRF cookie |

## Historical audit

The May 2026 point-in-time report (course IDOR, missing helmet, debug ingest) is archived at [`archive/SECURITY_AUDIT_2026-05-27.md`](./archive/SECURITY_AUDIT_2026-05-27.md). Many findings there are **fixed** — do not treat it as current status.
