/**
 * Office-communication route smoke — same drift net as the other suites.
 * GET-only against seeded data; RBAC walls asserted explicitly.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { env } from "../../src/config/env.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

let studentId = null;
let staffRow = null; // { userId, office: { slug } }

if (dbReady) {
  const student = await prisma.user.findFirst({
    where: { role: { name: "STUDENT" }, status: "ACTIVE" },
    select: { id: true },
  });
  studentId = student?.id ?? null;
  staffRow = await prisma.supportOfficeStaff.findFirst({
    where: { user: { status: "ACTIVE" } },
    select: { userId: true, office: { select: { slug: true } } },
  });
}

const tokenFor = (sub, role) =>
  jwt.sign({ sub, role, tokenType: "access" }, env.JWT_SECRET, { expiresIn: "10m" });
const authedGet = (path, token) =>
  request(app).get(path).set("Authorization", `Bearer ${token}`);

describe.skipIf(!dbReady || !studentId)("Offices smoke (database)", () => {
  it("student can list offices and own threads", async () => {
    const t = tokenFor(studentId, "STUDENT");
    for (const path of ["/api/offices", "/api/offices/threads/mine"]) {
      const res = await authedGet(path, t);
      expect(res.status, `${path} → ${res.status}`).toBe(200);
    }
  });

  it.skipIf(!dbReady || !staffRow)("staff can read their office inbox", async () => {
    const res = await authedGet(
      `/api/offices/${staffRow.office.slug}/inbox`,
      tokenFor(staffRow.userId, "TEACHER")
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.threads) || Array.isArray(res.body.results)).toBe(true);
    expect(res.body.status).toBe("success");
  });

  it.skipIf(!dbReady || !staffRow)("non-staff cannot read an office inbox", async () => {
    const res = await authedGet(
      `/api/offices/${staffRow.office.slug}/inbox`,
      tokenFor(studentId, "STUDENT")
    );
    expect(res.status).toBe(403);
  });

  it("non-admin cannot create offices", async () => {
    const res = await request(app)
      .post("/api/offices")
      .set("Authorization", `Bearer ${tokenFor(studentId, "STUDENT")}`)
      .send({ name: "X", slug: "x-smoke" });
    expect([401, 403]).toContain(res.status);
  });
});
