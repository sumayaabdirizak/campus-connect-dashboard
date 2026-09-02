/**
 * Authenticated route smoke tests — the safety net for schema/code drift.
 *
 * Every test hits a real handler with a real (minted) token against the
 * seeded dev database and asserts 200. This is exactly the class of check
 * that would have caught the `schedules` relation drift, which returned
 * 500 for every student on /my-courses while all the 401-only smoke tests
 * stayed green.
 *
 * Design notes:
 * - Tokens are minted directly (jwt.sign with the app's own secret) instead
 *   of driving the login flow — we're testing the feature routes, not auth,
 *   and this keeps the suite independent of seed passwords.
 * - GET-only on purpose: exercises the Prisma queries and serializers
 *   without mutating seed data, so the suite is safe to run repeatedly.
 * - Actors are discovered from the DB (first teacher-owned offering, a
 *   student registered in that offering's section) so the suite adapts to
 *   whatever the seed contains. Tests skip individually when an actor or
 *   fixture is missing rather than failing the whole run.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { env } from "../../src/config/env.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

// ── Actor + fixture discovery ────────────────────────────────────────────
let offering = null; // teacher-owned offering (numeric id + publicId)
let teacherId = null;
let studentId = null; // student registered in the offering's section

if (dbReady) {
  // Find a teacher-owned offering whose teacher account is ACTIVE (auth
  // middleware enforces live status, so an inactive seed user would 403).
  const candidates = await prisma.courseOffering.findMany({
    where: { teacherId: { not: null } },
    select: {
      id: true,
      publicId: true,
      teacherId: true,
      sectionId: true,
      teacher: { select: { status: true } },
    },
    take: 10,
  });
  offering = candidates.find((o) => o.teacher?.status === "ACTIVE") ?? null;
  teacherId = offering?.teacherId ?? null;

  if (offering) {
    const reg = await prisma.studentRegistration.findFirst({
      where: {
        batchSectionId: offering.sectionId,
        student: { status: "ACTIVE" },
      },
      select: { studentId: true },
    });
    studentId = reg?.studentId ?? null;
  }
}

function tokenFor(sub, role, extra = {}) {
  return jwt.sign({ sub, role, tokenType: "access", ...extra }, env.JWT_SECRET, {
    expiresIn: "10m",
  });
}

/** GET with a Bearer token; returns the supertest response. */
function authedGet(path, token) {
  return request(app).get(path).set("Authorization", `Bearer ${token}`);
}

/** Assert 200 with a useful failure message (status + body snippet). */
function expect200(res, path) {
  expect(
    res.status,
    `${path} → ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`
  ).toBe(200);
}

describe.skipIf(!dbReady)("Authenticated route smoke (database)", () => {
  // ── Teacher-scoped routes ──────────────────────────────────────────────
  describe.skipIf(!dbReady || !teacherId)("teacher routes", () => {
    const t = () => tokenFor(teacherId, "TEACHER");

    const teacherRoutes = () => [
      ["/api/users/me", "profile"],
      ["/api/lecturer-portal/courses", "course grid"],
      [`/api/lecturer-portal/courses/${offering.publicId}`, "course detail"],
      ["/api/lecturer-portal/my-assignments", "assignment overview"],
      [`/api/course-offerings/${offering.id}`, "assignments list"],
      [`/api/quizzes/${offering.id}`, "quizzes list"],
      [`/api/roster/${offering.id}`, "Student Logs"],
      [`/api/groups/${offering.id}`, "groups"],
      [`/api/resources/${offering.id}`, "resources"],
      [`/api/chat/${offering.id}`, "chat room"],
      [`/api/course-feed/${offering.id}`, "course feed"],
      [`/api/gradebook/${offering.id}`, "gradebook"],
      ["/api/announcements", "announcements feed"],
      ["/api/announcements/unread-count", "announcement unread count"],
      [
        `/api/calendar/events?from=2020-01-01T00:00:00.000Z&to=2030-01-01T00:00:00.000Z`,
        "calendar events",
      ],
    ];

    it("every teacher GET route returns 200", async () => {
      for (const [path, label] of teacherRoutes()) {
        const res = await authedGet(path, t());
        expect200(res, `[${label}] ${path}`);
      }
    });
  });

  // ── Student-scoped routes ──────────────────────────────────────────────
  describe.skipIf(!dbReady || !studentId)("student routes", () => {
    const s = () => tokenFor(studentId, "STUDENT");

    const studentRoutes = () => [
      ["/api/users/me", "profile"],
      ["/api/student-portal/my-courses", "my courses"],
      [`/api/student-portal/courses/${offering.publicId}`, "course detail"],
      [`/api/course-offerings/${offering.id}`, "assignments list"],
      [`/api/quizzes/${offering.id}`, "quizzes list"],
      [`/api/quiz-taking/${offering.id}/available`, "available quizzes"],
      [`/api/resources/${offering.id}`, "resources"],
      [`/api/chat/${offering.id}`, "chat room"],
      [`/api/course-feed/${offering.id}`, "course feed"],
      [`/api/groups/${offering.id}`, "groups"],
      [`/api/gradebook/${offering.id}/me`, "my grades"],
      ["/api/announcements", "announcements feed"],
      [
        `/api/calendar/events?from=2020-01-01T00:00:00.000Z&to=2030-01-01T00:00:00.000Z`,
        "calendar events",
      ],
    ];

    it("every student GET route returns 200", async () => {
      for (const [path, label] of studentRoutes()) {
        const res = await authedGet(path, s());
        expect200(res, `[${label}] ${path}`);
      }
    });

    it("student cannot read the teacher gradebook (RBAC)", async () => {
      const res = await authedGet(`/api/gradebook/${offering.id}`, s());
      expect([403, 404]).toContain(res.status);
    });
  });

  // ── Cross-role leakage guards ──────────────────────────────────────────
  describe.skipIf(!dbReady || !teacherId)("error responses stay sanitized", () => {
    it("unknown offering id returns a clean 4xx, not a stack leak", async () => {
      const res = await authedGet(
        "/api/lecturer-portal/courses/00000000-0000-0000-0000-000000000000",
        tokenFor(teacherId, "TEACHER")
      );
      expect([400, 403, 404]).toContain(res.status);
      const body = JSON.stringify(res.body);
      // Raw Prisma/driver messages contain these markers; sanitized ones don't.
      expect(body).not.toMatch(/prisma|invocation|PrismaClient/i);
    });
  });
});
