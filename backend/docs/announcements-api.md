# Announcements API (Sprint 3)

Base URL: `http://localhost:4000/api/announcements`  
Auth: required for all routes.  
Mutation CSRF: required (`X-CSRF-Token` must match `csrf_token` cookie).

## Data Model

### `Announcement`
- `id`: number
- `title`: string
- `content`: string
- `priority`: `"normal" | "important" | "urgent"`
- `targetType`: `"ALL" | "FACULTY" | "DEPARTMENT" | "BATCH" | "SECTION"`
- `facultyId | departmentId | batchId | sectionId`: scoped hierarchy fields
- `targetRoles`: string[] (must include viewer role to be visible)
- `publishedAt`: `Date | null` (future date = scheduled)
- `isPinned`: boolean
- `isActive`: boolean (soft delete uses `isActive=false`)

### `AnnouncementRead`
- unique per `(announcementId, userId)`
- created when a user marks as read (or opens detail endpoint)

## Scope Rules

- **SUPER_ADMIN**: can create/update/delete/pin globally.
- **DEAN**: can create/update/delete/pin only within dean faculty scope.
- **STUDENT/TEACHER/etc.**: read-only visibility based on:
  - role match in `targetRoles`, and
  - hierarchy overlap (`faculty/department/batch/section`) or `ALL`
  - `isActive=true`
  - `publishedAt` null or in the past.
- **Dean special case for `ALL`**: visible only when `announcement.facultyId` matches dean faculty.

## Endpoints

## `GET /`
Returns visible announcements for the authenticated user.

Query:
- `page` (default `1`)
- `pageSize` or `limit` (default `20`, max `100`)

Response:
```json
{
  "total": 23,
  "page": 1,
  "pageSize": 20,
  "results": [
    {
      "id": 101,
      "title": "Exam schedule",
      "targetType": "DEPARTMENT",
      "targeting": {
        "facultyId": 1,
        "departmentId": 3,
        "batchId": null,
        "sectionId": null
      },
      "targetRoles": ["STUDENT"],
      "isRead": false,
      "isPinned": false,
      "isActive": true
    }
  ]
}
```

## `GET /:id`
Returns one visible announcement. Also marks it as read for the caller.

## `GET /unread-count`
Returns unread count in current scope.

Response:
```json
{ "unreadCount": 4 }
```

## `GET /me-visibility`
Debug/support endpoint returning resolved visibility scope vectors for current user.

## `POST /`
Create announcement.  
Roles allowed: `SUPER_ADMIN`, `DEAN`.

Content-Type:
- `application/json`, or
- `multipart/form-data` with image files (`images[]`) plus payload fields.

Required fields:
- `title`, `content`, `targetType`, `targetRoles[]`

Conditional required fields by `targetType`:
- `FACULTY` -> `facultyId`
- `DEPARTMENT` -> `departmentId`
- `BATCH` -> `batchId`
- `SECTION` -> `sectionId`

Optional:
- `priority`, `publishedAt`, `isPinned`, `imageUrls[]`

### Dean-specific create constraints

- Dean is automatically scoped to dean faculty; `facultyId` is not required from dean clients.
- Dean can only use `targetType`:
  - `DEPARTMENT`
  - `BATCH`
  - `SECTION`
- Dean can only target roles:
  - `STUDENT`
  - `LECTURER` (normalized to `TEACHER` internally)
- Exactly one scope id must match `targetType`:
  - `DEPARTMENT` -> only `departmentId`
  - `BATCH` -> only `batchId`
  - `SECTION` -> only `sectionId`

### Create modal payload examples

Department-targeted with image:

```json
{
  "title": "Welcome to the new semester",
  "content": "Orientation starts next week.",
  "priority": "important",
  "targetType": "DEPARTMENT",
  "departmentId": 3,
  "targetRoles": ["STUDENT", "LECTURER"],
  "publishedAt": null
}
```

Section-targeted scheduled post:

```json
{
  "title": "Section A reminder",
  "content": "Lab schedule has changed.",
  "priority": "normal",
  "targetType": "SECTION",
  "sectionId": 6,
  "targetRoles": ["STUDENT"],
  "publishedAt": "2026-05-15T10:00:00.000Z"
}
```

Multipart form for image upload:
- send announcement fields as form values
- attach one or more files as `images`
- backend stores uploaded URLs into `imageUrls`

## `PATCH /:id`
Update announcement metadata/scope.

Permissions:
- privileged roles (`SUPER_ADMIN`, `ADMIN`, `DEAN`) with scope checks
- creator can edit own item if still within visibility constraints

## `PATCH /:id/pin`
Toggle pin state.  
Roles allowed: `SUPER_ADMIN`, `DEAN`.

Business rule:
- max 5 pinned announcements in caller scope.

## `DELETE /:id`
Soft delete only (`isActive=false`).  
Roles allowed: `SUPER_ADMIN`, `DEAN`.

## `POST /:id/read`
Marks announcement as read for current user (idempotent).

Response:
```json
{ "success": true }
```

## Real-time Events (Socket.IO)

Server emits:
- `announcement:new` on create
- `announcement:updated` on pin toggle/update

Room routing uses scope channels:
- `faculty:{facultyId}`
- `department:{departmentId}`
- `batch:{batchId}`
- `section:{sectionId}`

Clients join rooms on socket auth connect based on resolved user scope.

## Errors

Errors follow standard backend error envelope where applicable:
```json
{
  "status": "error",
  "message": "Validation failed",
  "details": null
}
```

Legacy route-level errors may still return `{ "message": "..." }` for some paths.
