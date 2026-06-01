# Security audit — campus-connect
_Generated 2026-05-27_

## Top-line verdict

The auth flow itself is reasonable (httpOnly cookies, refresh rotation, login rate limiting, double-submit CSRF), and the `quizzes` / `quiz-taking` / `question-bank` controllers are properly gated by `requireCourseOfferingRead/Manage` middleware. The biggest hole is **horizontal IDOR across course-scoped resources**: `attendance`, `groups`, `roster`, `chat`, and `resources` routes only call `auth()` — any authenticated user (e.g. a STUDENT enrolled in a single course) can read, write, or delete data in any other `courseOfferingId` simply by changing the path parameter. Secondary concerns: there is no `helmet`/CSP/HSTS middleware on the API, debug instrumentation in `auth.controller.js` and `errorHandler.js` POSTs request data (incl. user IDs, email, role, query paths) to `127.0.0.1:7768` and writes it to `debug-b7cda9.log`, and `npm audit` reports a CRITICAL `sanitize-html` XSS plus several HIGH issues. CSRF + login rate limiting are in place; web-push subscribe and quiz violation endpoints are NOT rate-limited.

## Severity counts
🔴 6 high · 🟡 8 medium · 🟢 3 low

## Findings by category

### 1. Missing authorization (IDOR)

| # | Route | File:line | Issue | Severity |
|---|---|---|---|---|
| F1 | `GET/POST/DELETE/PATCH /api/attendance/:courseOfferingId/*` | `backend/src/controllers/courseDetails/attendance.js:41,59,78,87,104,146,166,240` | Only `auth` — no membership/RBAC check. Any logged-in user can read & mutate attendance for any course offering. | 🔴 |
| F2 | `GET/POST /api/groups/:courseOfferingId`, `DELETE/POST /api/groups/:groupId/members/*` | `backend/src/controllers/courseDetails/groups.js:8,23,42,51,68` | Only `auth`. Any user can list/create/delete groups in any course and add or remove arbitrary students. | 🔴 |
| F3 | `GET /api/roster/:courseOfferingId`, `DELETE /api/roster/:courseOfferingId/students/:studentId` | `backend/src/controllers/courseDetails/roster.js:8,30` | Only `auth`. Reveals enrolled-student emails for every offering and lets any user **unenroll any student from any class**. | 🔴 |
| F4 | `GET/POST/PATCH/DELETE /api/chat/:courseOfferingId/*` and `/messages/*` | `backend/src/controllers/courseDetails/chat.js:87,116,157,200,221` | Only `auth`. No membership check on read or post — a STUDENT can read & post in any course's chat. Edit/delete are guarded by sender-ownership, which is correct. | 🔴 |
| F5 | `GET/POST/PATCH /api/resources/:courseOfferingId/*`, `POST /api/resources/upload`, module CRUD, `POST /reorder` | `backend/src/controllers/courseDetails/resources.js:47,64,81,95,112,126,144,185,206,222,243,252` | Only `auth`. Any user can list/upload/edit/delete course resources and reorder modules in any course. The `/reorder` and `/modules/reorder` endpoints accept arbitrary IDs without scope checks. | 🔴 |
| F6 | `GET/POST/PATCH/DELETE /api/course-feed/*` (post mutate endpoints) | `backend/src/controllers/courseDetails/course-feed.js:37,52,89,115,134,193,218` | Only `auth`. Read & create are unscoped. Edit/delete enforce `authorId` ownership (correct), but anyone can post in any course feed and react/reply in others. | 🟡 |
| F7 | `POST /api/course-access/:courseOfferingId/ping`, `GET /api/course-access/:courseOfferingId` | `backend/src/controllers/courseDetails/course-access.js:9,29` | Only `auth`. Likely informational but accepts arbitrary IDs — review whether response leaks course state. | 🟡 |

### 2. XSS sinks (frontend)

| # | Location | Status | Severity |
|---|---|---|---|
| F8 | `frontend/src/app/layout.tsx:37` | Static literal `__html` — safe. | 🟢 |
| F9 | `frontend/src/features/announcements/components/announcement-content.tsx:211` | Uses `isomorphic-dompurify` (`sanitize-html` underneath); **see F18 — DOMPurify package + transitive `sanitize-html` is on a CRITICAL CVE**. Code-level usage looks correct. | 🟡 |
| F10 | `frontend/src/components/ui/chart.tsx:80` | Generated theme CSS, no user input. Safe. | 🟢 |

### 3. Rate limiting

| Endpoint | Status | Severity |
|---|---|---|
| `POST /auth/login` | `loginRateLimit` 5/min — OK | 🟢 |
| `POST /auth/refresh` | `refreshRateLimit` 10/min — OK | 🟢 |
| `POST /auth/register` (admin-only via `/users`) | No rate limit (admin gated though) | 🟢 |
| `POST /api/quiz-taking/attempts/:id/violation` | F11 — No rate limit. Idempotent only after submit; before submit, a malicious client could send N requests and exhaust the 3-warning budget to auto-close another student's attempt (combined with F12 below this is exploitable). `quiz-taking.js:420` | 🟡 |
| `POST /api/push/subscribe` | F12 — No rate limit. Allows storage of unbounded `webPushSubscription` rows per user. `routes.push.js:27` | 🟡 |
| `/api/discussions` | Has `discussionsRateLimit` 180/min — OK | 🟢 |
| Forgot/reset password | Not implemented; out of scope | — |

### 4. File uploads

| # | Finding | Severity |
|---|---|---|
| F13 | `resources.js:13,31` — MIME filter trusts client-sent `file.mimetype` and accepts `application/*`, `image/*`, `text/*`, `video/*`. No magic-byte sniff. A `.html` renamed to `.pdf` with `Content-Type: application/pdf` is accepted and served from `/uploads/resources/...`. Original filename's extension is preserved in the stored filename (`Date.now()-rand{ext}`). Since uploaded files are served by `express.static('uploads')` (`app.js:56`) WITHOUT `Content-Disposition: attachment`, an attacker can upload a crafted HTML/SVG and link to it — **stored XSS in same origin as the app**. | 🔴 |
| F14 | `resources.js POST /upload` (line 64) — only `auth`, no course-membership check (compounds with F13/F5). | 🔴 (covered above) |

### 5. Authentication weaknesses

| # | Finding | Severity |
|---|---|---|
| F15 | `JWT_SECRET` is read via `env.js:9` and `assertEnv()` (`env.js:12-16`) throws if missing. **No fallback default** — good. | 🟢 |
| F16 | Cookies set with `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV==='production'` (`auth.controller.js:115-128`). Acceptable. CSRF cookie is `httpOnly:false` by design (double-submit). | 🟢 |
| F17 | bcrypt cost factor is **10** (`users.controller.js:104`, `auth.controller.js` reads). Acceptable but consider 12 for new deployments. | 🟢 |
| F18 | No session/refresh-token invalidation: `postLogout` (`auth.controller.js:272`) only clears cookies. A stolen JWT/refresh token remains valid for its full TTL (access 1h, refresh 14d). No `jti`/`tokenVersion` revocation list. | 🟡 |

### 6. CSRF

CSRF protection is enforced via double-submit cookie in `middleware/csrf.js` for all non-GET/HEAD/OPTIONS `/api` requests except `/auth/login`, `/auth/refresh`, `/auth/csrf`. Implementation is correct.

| # | Finding | Severity |
|---|---|---|
| F19 | `csrf.js:43` — header/cookie equality is checked with `!==` (timing-safe comparison not used). Low risk since the token is 32 random bytes hex and the comparison is on the server, but `crypto.timingSafeEqual` would be cleaner. | 🟢 |

### 7. CORS / security headers

| # | Finding | Severity |
|---|---|---|
| F20 | **No `helmet`, no CSP, no HSTS, no X-Frame-Options/`frame-ancestors`, no `Referrer-Policy`** anywhere in `app.js`. Combined with F13 (uploads served from app origin) and the announcement HTML sink (F9), the lack of CSP materially increases impact of any stored XSS. | 🔴 |
| F21 | CORS is hard-coded to `http://localhost:3000` (`app.js:58-61`) — not config-driven. Will need to change for any non-localhost env. Low-severity but worth noting. | 🟢 |

### 8. Sensitive data exposure

| # | Finding | Severity |
|---|---|---|
| F22 | `auth.controller.js:27-53, 173-200` and `middleware/errorHandler.js:42-78` ship **debug instrumentation** that POSTs `{ userId, email (via login flow), role, request path, method, Prisma error meta }` to `http://127.0.0.1:7768/ingest/...` and appends the same payload to `debug-b7cda9.log` on every login and every Prisma known-error. This is left-over debug code that **must not run in production** — it leaks PII to whatever listens on that port and creates an unbounded log file. | 🔴 |
| F23 | `users.controller.js:8 getAllUsers` selects explicit fields — `password_hash` not exposed. `getMe` (`users.controller.js:200-244`) uses an explicit `select` block; `password_hash` not returned. OK. | 🟢 |
| F24 | `auth.js:40` — auth middleware logs `"token verification failed"` only in non-prod. OK. | 🟢 |

### 9. Prisma query safety

All `$queryRaw` / `$executeRaw` usages reviewed use Prisma's tagged-template interpolation (parameterised). No `$queryRawUnsafe` / `$executeRawUnsafe` was found.

- `app.js:68` — `SELECT 1` literal.
- `features/announcements/services/announcementAnalytics.service.js:128`, `announcementSearch.service.js:28` — tagged-template with bound parameters.
- `announcementService.js:926` — `pg_advisory_xact_lock(${id}, ${id})` — values are numeric IDs bound via Prisma. Safe.

### 10. Dependency hygiene (`npm audit --omit=dev`)

| Package | Severity | Note |
|---|---|---|
| `sanitize-html` 2.17.3 | **CRITICAL** | XSS via `xmp` raw-text passthrough — `GHSA-rpr9-rxv7-x643`. Used transitively by `isomorphic-dompurify` server-side; fix available. |
| `path-to-regexp` 8.0.0–8.3.0 | HIGH | ReDoS — `GHSA-j3q9-mxjg-w52f`, `GHSA-27v5-c462-wpq7`. |
| `defu` ≤6.1.4 | HIGH | Prototype pollution. |
| `effect` <3.20.0 | HIGH | Async context loss (pulled in via Prisma 6.x). |
| `ip-address` / `express-rate-limit` 8.0.1–8.5.0 | moderate | XSS in unused HTML helper. |
| `ws` 8.0.0–8.20.0 | moderate | — |
| `qs` 6.11.x | moderate | DoS. |

`npm audit fix` resolves most.

---

## TOP 3 ACTIONABLE FIXES

### Fix 1 — Add course-membership RBAC to attendance / groups / roster / chat / resources

**Finding:** F1–F5. The single highest-impact set of bugs: any STUDENT in any course can read and mutate data in any other course by changing `:courseOfferingId`. A student can unenroll classmates from rival sections (`DELETE /api/roster/:offering/students/:id`), upload arbitrary HTML to be served from the app origin (`POST /api/resources/upload`), forge attendance records, and read every other course's chat.

**Files to edit:**
- `backend/src/controllers/courseDetails/attendance.js`
- `backend/src/controllers/courseDetails/groups.js`
- `backend/src/controllers/courseDetails/roster.js`
- `backend/src/controllers/courseDetails/chat.js`
- `backend/src/controllers/courseDetails/resources.js`
- `backend/src/controllers/courseDetails/course-feed.js` (read endpoints)

**Approach:** The codebase already has working middleware (`requireCourseOfferingRead`, `requireCourseOfferingManage`) used correctly in `quizzes.js`, `quiz-taking.js`, `question-bank.js`, and `course-offerings.js`. Add the same middleware to every route in the five controllers above: `requireCourseOfferingRead()` on GETs and student-facing POSTs (chat send, group join), `requireCourseOfferingManage()` on teacher-only mutations (attendance create/edit, roster delete, module create, resource upload). For routes parameterised by a sub-id (`/groups/:groupId/members`, `/chat/messages/:messageId`, `/resources/:resourceId`), add a server-side lookup that resolves the parent `courseOfferingId` then runs the same gate. The `/reorder` endpoints should validate every submitted ID belongs to a course the caller can manage.

**Effort:** ~2.5 hours (5 files, ~25 routes, mechanical addition).
**Tests:** Yes — existing RBAC test fixtures cover quizzes; clone those patterns for the new gates. Add at least one "student in course A cannot reach course B" assertion per controller.

---

### Fix 2 — Remove the debug-b7cda9 instrumentation and add a Helmet/CSP layer

**Finding:** F20 + F22. The `auth.controller.js` and `errorHandler.js` files contain hard-coded `fetch("http://127.0.0.1:7768/ingest/31870779-...")` blocks plus `fs.appendFileSync` to `debug-b7cda9.log` that fire on every login and every Prisma known-error. There is no environment guard. Combined with the absence of any security headers (no helmet, no CSP), an XSS via F13 has nothing constraining it.

**Files to edit:**
- `backend/src/controllers/auth/auth.controller.js` (remove lines ~13, 26–54, 172–200)
- `backend/src/middleware/errorHandler.js` (remove lines ~3, 8, 41–79)
- `backend/src/app.js` (add `helmet` and a baseline CSP)
- `backend/package.json` (`npm i helmet`)

**Approach:** Strip the `// #region agent log` … `// #endregion` blocks entirely along with the `__agentLogPath` declarations and the `fs`/`path`/`fileURLToPath` imports they introduced. Delete the `debug-b7cda9.log` file from the repo and add it to `.gitignore`. Add `app.use(helmet())` near the top of `app.js` (after `express.json()`, before routes). Configure a starting CSP: `default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'`. Also set `Content-Disposition: attachment` on the `/uploads` static handler (one line option to `express.static`) to neutralise the upload-XSS vector.

**Effort:** ~1 hour.
**Tests:** Smoke-test that login still works and that requests don't 500 because of CSP. No fixture changes.

---

### Fix 3 — Lock down the resource upload pipeline

**Finding:** F13 + F14. `multer` is configured to accept any `application/*`, `image/*`, `text/*`, or `video/*` based on the **client-supplied** `file.mimetype`, no magic-byte verification, no extension allowlist. Files are stored under `/uploads/resources` and served via `express.static('uploads')` with no `Content-Disposition`. An authenticated user (any course, because of F5) can upload a `.html` declaring `Content-Type: application/pdf` and serve same-origin script content.

**Files to edit:**
- `backend/src/controllers/courseDetails/resources.js`
- `backend/src/app.js` (the `app.use('/uploads', …)` line)

**Approach:** Add a fixed extension allowlist (`.pdf .docx .pptx .xlsx .png .jpg .jpeg .gif .webp .mp4 .webm .mp3 .txt .csv`) checked from `path.extname(file.originalname).toLowerCase()`, reject anything else inside `fileFilter`. Use `file-type` (already common transitive) or read the first 12 bytes after upload and verify the magic matches the claimed extension; delete the file and 415 otherwise. Switch the static serve to `express.static('uploads', { setHeaders: (res) => res.setHeader('Content-Disposition', 'attachment') })` so browsers never execute HTML/SVG/JS from the upload origin. Cap originalname length to 200 chars to prevent log/path issues. Apply Fix 1's RBAC to `POST /api/resources/upload` so non-enrolled users can't drop files.

**Effort:** ~1.5 hours.
**Tests:** Yes — add a test that uploading `evil.html` with `Content-Type: application/pdf` is rejected, and that a successful PDF upload returns with `Content-Disposition: attachment` when fetched.
