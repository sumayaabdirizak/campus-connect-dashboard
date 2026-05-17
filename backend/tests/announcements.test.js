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
    expect(where.AND?.[0]?.AND?.[0]).toMatchObject({ isActive: true });
    expect(where.AND?.[0]?.AND?.[1]?.OR).toEqual(
      expect.arrayContaining([
        { createdById: 11 },
        expect.objectContaining({
          AND: expect.arrayContaining([
            { status: { in: ["PUBLISHED", "SCHEDULED"] } },
            {
              OR: [{ publishedAt: null }, { publishedAt: { lte: expect.any(Date) } }],
            },
          ]),
        }),
      ]),
    );
    expect(where.AND?.[1]?.OR).toEqual(
      expect.arrayContaining([
        { createdById: 11 },
        expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ OR: expect.any(Array) }),
            { targetRoles: { has: "STUDENT" } },
          ]),
        }),
      ]),
    );
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

  it("hides DRAFT from non-creators", () => {
    const student = { id: 11, role: "STUDENT", facultyIds: [1], departmentIds: [2], batchIds: [3], sectionIds: [4] };
    const draft = {
      isActive: true,
      status: "DRAFT",
      createdById: 99,
      targetType: "ALL",
      facultyId: 1,
      departmentId: null,
      batchId: null,
      sectionId: null,
      targetRoles: ["STUDENT"],
      publishedAt: null,
    };
    expect(canUserSeeAnnouncement(student, draft)).toBe(false);
  });

  it("allows creator to see own DRAFT", () => {
    const dean = { id: 10, role: "DEAN", facultyIds: [7], departmentIds: [70], batchIds: [], sectionIds: [] };
    const ownDraft = {
      isActive: true,
      status: "DRAFT",
      createdById: 10,
      targetType: "DEPARTMENT",
      facultyId: 7,
      departmentId: 70,
      batchId: null,
      sectionId: null,
      targetRoles: ["STUDENT"],
      publishedAt: null,
    };
    expect(canUserSeeAnnouncement(dean, ownDraft)).toBe(true);
  });
});

describe("Announcements API role/scoped flow", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces role checks and dean target constraints", async () => {
    const statusCol = await prisma.$queryRawUnsafe(
      `SELECT 1 AS ok FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'status' LIMIT 1`,
    );
    if (!Array.isArray(statusCol) || statusCol.length === 0) {
      console.warn(
        "[announcements.test] Skipping API flow: DB missing Announcement modernization columns. Run: npm run prisma:migrate:deploy",
      );
      expect(true).toBe(true);
      return;
    }

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

    const draftRes = await request(app)
      .post("/api/announcements")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken)
      .send({
        title: `draft-hidden-${Date.now()}`,
        content: "draft body for visibility test",
        priority: "normal",
        targetType: "DEPARTMENT",
        departmentId: dept.id,
        targetRoles: ["STUDENT", "LECTURER"],
        status: "DRAFT",
      });
    expect(draftRes.status).toBe(201);
    expect(draftRes.body).toMatchObject({ status: "DRAFT" });
    const draftId = draftRes.body.id;

    const studentList = await request(app)
      .get("/api/announcements?pageSize=200")
      .set("Cookie", [student.authCookie, `csrf_token=${student.csrfToken}`])
      .set("X-CSRF-Token", student.csrfToken);
    expect(studentList.status).toBe(200);
    const studentIds = (studentList.body.results ?? []).map((r) => r.id);
    expect(studentIds).not.toContain(draftId);

    const deanList = await request(app)
      .get("/api/announcements?pageSize=200")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken);
    expect(deanList.status).toBe(200);
    const deanIds = (deanList.body.results ?? []).map((r) => r.id);
    expect(deanIds).toContain(draftId);

    const studentDraftsList = await request(app)
      .get("/api/announcements?status=DRAFT")
      .set("Cookie", [student.authCookie, `csrf_token=${student.csrfToken}`])
      .set("X-CSRF-Token", student.csrfToken);
    expect(studentDraftsList.status).toBe(403);

    const deanDraftsList = await request(app)
      .get("/api/announcements?status=DRAFT&pageSize=100")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken);
    expect(deanDraftsList.status).toBe(200);
    const draftResults = deanDraftsList.body.results ?? [];
    expect(draftResults.some((r) => r.id === draftId)).toBe(true);
    for (const row of draftResults) {
      expect(row.status).toBe("DRAFT");
      expect(row.createdBy?.userId).toBe(deanProfile.id);
    }

    const deanDraftsPage1 = await request(app)
      .get("/api/announcements?status=DRAFT&page=1&pageSize=1")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken);
    expect(deanDraftsPage1.status).toBe(200);
    expect(deanDraftsPage1.body.pageSize).toBe(1);
    expect((deanDraftsPage1.body.results ?? []).length).toBeLessThanOrEqual(1);
    expect(typeof deanDraftsPage1.body.total).toBe("number");
    expect(deanDraftsPage1.body.total).toBeGreaterThanOrEqual(1);
    expect(typeof deanDraftsPage1.body.totalCount).toBe("number");
    expect(deanDraftsPage1.body.totalCount).toBe(deanDraftsPage1.body.total);
    expect(deanDraftsPage1.headers["x-total-count"]).toBe(String(deanDraftsPage1.body.total));
  });

  it("returns 400 for invalid dateFrom on GET /api/announcements", async () => {
    const statusCol = await prisma.$queryRawUnsafe(
      `SELECT 1 AS ok FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Announcement' AND column_name = 'status' LIMIT 1`,
    );
    if (!Array.isArray(statusCol) || statusCol.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const dean = await loginAs("dean.computing@university.edu");
    if (!dean) {
      console.warn("[announcements.test] Skipping date filter test: login failed");
      expect(true).toBe(true);
      return;
    }
    const res = await request(app)
      .get("/api/announcements?dateFrom=not-a-date")
      .set("Cookie", [dean.authCookie, `csrf_token=${dean.csrfToken}`])
      .set("X-CSRF-Token", dean.csrfToken);
    expect(res.status).toBe(400);
    expect(String(res.body?.message ?? "")).toMatch(/dateFrom/i);
  });
});
