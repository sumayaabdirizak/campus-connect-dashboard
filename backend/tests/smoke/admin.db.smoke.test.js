/**
 * Dean + Super Admin route smoke tests — same drift-catching net as
 * routes.db.smoke.test.js, for the administrative surface. GET-only against
 * the seeded dev DB with minted tokens; every route must return 200 and
 * cross-role access must stay walled off.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { env } from "../../src/config/env.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

let deanUserId = null; // must have a DeanProfile (requireDean reads it)
let superAdminId = null;

if (dbReady) {
  const deanProfile = await prisma.deanProfile.findFirst({
    where: { user: { status: "ACTIVE" } },
    select: { userId: true },
  });
  deanUserId = deanProfile?.userId ?? null;

  const sa = await prisma.user.findFirst({
    where: { role: { name: "SUPER_ADMIN" }, status: "ACTIVE" },
    select: { id: true },
  });
  superAdminId = sa?.id ?? null;
}

function tokenFor(sub, role) {
  return jwt.sign({ sub, role, tokenType: "access" }, env.JWT_SECRET, {
    expiresIn: "10m",
  });
}

const authedGet = (path, token) =>
  request(app).get(path).set("Authorization", `Bearer ${token}`);

function expect200(res, path) {
  expect(
    res.status,
    `${path} → ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`
  ).toBe(200);
}

const DEAN_ROUTES = [
  "/api/dean/users",
  "/api/dean/batches",
  "/api/dean/teachers",
  "/api/dean/courses",
  "/api/dean/offerings",
  "/api/dean/analytics",
  "/api/dean/reports",
];

const SUPER_ADMIN_ROUTES = [
  "/api/admin/analytics",
  "/api/admin/faculties",
  "/api/admin/audit-logs",
  "/api/admin/audit-logs/stats",
  "/api/admin/audit-logs/actors",
  "/api/faculties",
  "/api/departments",
  "/api/programs",
  "/api/academic-years",
  "/api/batches",
  "/api/courses",
];

describe.skipIf(!dbReady)("Admin route smoke (database)", () => {
  describe.skipIf(!dbReady || !deanUserId)("dean routes", () => {
    it("every dean GET route returns 200", async () => {
      const token = tokenFor(deanUserId, "DEAN");
      for (const path of DEAN_ROUTES) {
        const res = await authedGet(path, token);
        expect200(res, path);
      }
    });
  });

  describe.skipIf(!dbReady || !superAdminId)("super admin routes", () => {
    it("every super admin GET route returns 200", async () => {
      const token = tokenFor(superAdminId, "SUPER_ADMIN");
      for (const path of SUPER_ADMIN_ROUTES) {
        const res = await authedGet(path, token);
        expect200(res, path);
      }
    });
  });

  describe.skipIf(!dbReady || !deanUserId || !superAdminId)("cross-role walls", () => {
    it("a dean cannot read super-admin analytics", async () => {
      const res = await authedGet("/api/admin/analytics", tokenFor(deanUserId, "DEAN"));
      expect([401, 403]).toContain(res.status);
    });

    it("a teacher-role token cannot read dean routes", async () => {
      // Role claim alone must not open the dean portal — requireDean checks
      // both the role and a real DeanProfile row.
      const res = await authedGet("/api/dean/users", tokenFor(superAdminId, "TEACHER"));
      expect([401, 403]).toContain(res.status);
    });

    it("a forged DEAN role without a DeanProfile is rejected", async () => {
      const res = await authedGet("/api/dean/users", tokenFor(superAdminId, "DEAN"));
      expect([401, 403]).toContain(res.status);
    });
  });
});
