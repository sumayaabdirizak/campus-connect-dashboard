import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import {
  buildVisibleAnnouncementsWhere,
  canUserSeeAnnouncement,
} from "../src/utils/announcement-visibility.js";

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "password123";

function parseCookiePair(rawCookie) {
  const [pair] = String(rawCookie).split(";");
  return pair;
}

async function loginAs(email) {
  const res = await request(app).post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  if (res.status !== 200) return null;
  const setCookie = res.headers["set-cookie"] || [];
  const cookiePairs = setCookie.map(parseCookiePair);
  const csrfCookie = cookiePairs.find((c) => c.startsWith("csrf_token=")) || "";
  const csrfToken = csrfCookie.split("=")[1];
  const authCookie = cookiePairs.find((c) => c.startsWith("auth_token="));
  if (!authCookie || !csrfToken) return null;
  return {
    authCookie,
    csrfToken,
  };
}

describe("Announcements visibility utility", () => {
  it("restricts dean ALL visibility to dean faculty only", () => {
    const dean = { id: 10, role: "DEAN", facultyIds: [7], departmentIds: [], batchIds: [], sectionIds: [] };
    const inFacultyAll = {
      isActive: true,
      targetType: "ALL",
      facultyId: 7,
      departmentId: null,
      batchId: null,
      sectionId: null,
      targetRoles: ["DEAN"],
      publishedAt: null,
    };
    const outsideFacultyAll = { ...inFacultyAll, facultyId: 8 };
    expect(canUserSeeAnnouncement(dean, inFacultyAll)).toBe(true);
    expect(canUserSeeAnnouncement(dean, outsideFacultyAll)).toBe(false);
  });

  it("builds where clause with target role + published + active guards", () => {
    const student = { id: 11, role: "STUDENT", facultyIds: [1], departmentIds: [2], batchIds: [3], sectionIds: [4] };
    const where = buildVisibleAnnouncementsWhere(student);
    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        expect.objectContaining({
          AND: expect.arrayContaining([
            { isActive: true },
            { OR: [{ publishedAt: null }, { publishedAt: { lte: expect.any(Date) } }] },
          ]),
        }),
        {
          OR: expect.arrayContaining([
            { createdById: 11 },
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({ OR: expect.any(Array) }),
                { targetRoles: { has: "STUDENT" } },
              ]),
            }),
          ]),
        },
      ]),
    });
  });

  it("allows creator to see own announcement regardless target role", () => {
    const dean = { id: 10, role: "DEAN", facultyIds: [7], departmentIds: [70], batchIds: [], sectionIds: [] };
    const ownAnnouncement = {
      isActive: true,
      createdById: 10,
      targetType: "DEPARTMENT",
      facultyId: 7,
      departmentId: 70,
      batchId: null,
      sectionId: null,
      targetRoles: ["STUDENT"],
      publishedAt: null,
    };
    expect(canUserSeeAnnouncement(dean, ownAnnouncement)).toBe(true);
  });
});

describe("Announcements API role/scoped flow", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces role checks and dean target constraints", async () => {
    const superAdmin = await loginAs("super.admin@university.edu");
    const dean = await loginAs("dean.computing@university.edu");
    const student = await loginAs("student.bsc-cs-b1.section-a.1@university.edu");
    if (!superAdmin || !dean || !student) {
      console.warn(
        "[announcements.test] Skipping API flow: seed users/password missing. Run prisma seed and ensure E2E_TEST_PASSWORD."
      );
      expect(true).toBe(true);
      return;
    }

    const studentCreate = await request(app)
      .post("/api/announcements")
      .set("Cookie", [student.authCookie, `csrf_token=${student.csrfToken}`])
      .set("X-CSRF-Token", student.csrfToken)
      .send({
        title: `forbidden-${Date.now()}`,
        content: "students must not create",
        priority: "normal",
        targetType: "ALL",
        targetRoles: ["STUDENT"],
      });
    expect(studentCreate.status).toBe(403);

    const deanProfile = await prisma.user.findUnique({
      where: { email: "dean.computing@university.edu" },
      select: { deanProfile: { select: { facultyId: true } }, id: true },
    });
    expect(deanProfile?.deanProfile?.facultyId).toBeTruthy();
    const dept = await prisma.department.findFirst({
      where: { facultyId: deanProfile.deanProfile.facultyId },
      select: { id: true },
    });
    expect(dept?.id).toBeTruthy();

    const created = await request(app)
      .post("/api/announcements")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken)
      .send({
        title: `Sprint3 test ${Date.now()}`,
        content: "scoped announcement",
        priority: "important",
        targetType: "DEPARTMENT",
        departmentId: dept.id,
        targetRoles: ["STUDENT", "LECTURER"],
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: expect.any(String),
      targetType: "DEPARTMENT",
      targetRoles: expect.arrayContaining(["STUDENT", "TEACHER"]),
    });

    const deanBadRole = await request(app)
      .post("/api/announcements")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken)
      .send({
        title: `bad-role-${Date.now()}`,
        content: "dean should not target dean role",
        priority: "normal",
        targetType: "DEPARTMENT",
        departmentId: dept.id,
        targetRoles: ["DEAN"],
      });
    expect(deanBadRole.status).toBe(400);

    const deanBadScope = await request(app)
      .post("/api/announcements")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken)
      .send({
        title: `bad-scope-${Date.now()}`,
        content: "dean should not use ALL scope",
        priority: "normal",
        targetType: "ALL",
        targetRoles: ["STUDENT"],
      });
    expect(deanBadScope.status).toBe(400);

    const createdId = created.body.id;
    const readRes = await request(app)
      .post(`/api/announcements/${createdId}/read`)
      .set("Cookie", [student.authCookie, `csrf_token=${student.csrfToken}`])
      .set("X-CSRF-Token", student.csrfToken);
    expect(readRes.status).toBe(200);
    expect(readRes.body).toMatchObject({ success: true });

  });
});
