# Demo guide — Campus Connect

15-minute walkthrough for thesis demos and local QA.

## Prerequisites

```bash
npm run install:all
cd backend && cp .env.example .env   # set DATABASE_URL + JWT_SECRET
npm run prisma:migrate && npm run prisma:seed
cd .. && npm run dev                # API :4000 · FE :3000
```

Optional: `SEED_MINIMAL=1` for a smaller dataset before seeding.

## Seed accounts

Password for all seeded users: **`password123`**

| Role | Email |
|------|-------|
| Super Admin | `super.admin@university.edu` |
| Dean | `dean.computing@university.edu` |
| Teacher | `lecturer.cs1@university.edu` |
| Student | `student.bsc-cs-b1.section-a.1@university.edu` |

## 15-minute script

1. **Sign in as Super Admin** — open Faculties / Users / Audit Logs; confirm RBAC sidebar.
2. **Dean** — Setup: Departments → Programs → Batches → Users → Courses → Course offerings.
3. **Teacher** — My Courses → open an offering (UUID URL) → switch tabs: Feed, Assignments, Quizzes, Resources, Roster, Grades.
4. **Student** — My Courses → same offering → submit or view assignments / grades; check Calendar.
5. **Discussions** — `/dashboard/chat` as teacher or student; join a server channel; send a message.
6. **Messages / Offices** — `/dashboard/messages` (inbox) if seeded; optional office thread.
7. **Logout** — confirm cookies clear (`POST /auth/logout`); re-login required.

## Postman (Nav RBAC)

Collection (if present): `docs/postman/campus-connect-nav-rbac.postman_collection.json`

Flow: login → CSRF → `POST /api/rbac/pages/sync` → assign pages to a role → `GET /api/rbac/me/nav-pages`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 401 on every API | CORS / `NEXT_PUBLIC_API_URL`; cookies need same-host or trusted proxy |
| Empty sidebar | `npm run rbac:sync` in backend; check `GET /api/rbac/me/nav-pages` |
| Prisma client drift | Restart backend after migrate; `npx prisma generate` |
