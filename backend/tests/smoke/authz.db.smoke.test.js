/**
 * Authz / CSRF / revocation guards — Phase 2 production hardening tests.
 *
 * Skips when DB is unavailable. Discovers fixtures from seed like routes.db.smoke.
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { env } from "../../src/config/env.js";
import { newJti, revokeJti } from "../../src/utils/tokenRevocation.js";
import { assertAccessJwt } from "../../src/socket/middleware/assertAccessJwt.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

let offering = null;
let foreignOffering = null;
let teacherId = null;
let studentId = null;

if (dbReady) {
  const candidates = await prisma.courseOffering.findMany({
    where: { teacherId: { not: null } },
    select: {
      id: true,
      publicId: true,
      teacherId: true,
      sectionId: true,
      teacher: { select: { status: true } },
    },
    take: 20,
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

    // Prefer an offering the student is NOT registered in (true IDOR fixture).
    const registeredSectionIds = studentId
      ? (
          await prisma.studentRegistration.findMany({
            where: { studentId },
            select: { batchSectionId: true },
          })
        ).map((r) => r.batchSectionId)
      : [];

    foreignOffering =
      candidates.find(
        (o) =>
          o.id !== offering.id &&
          o.teacher?.status === "ACTIVE" &&
          !registeredSectionIds.includes(o.sectionId)
      ) ?? null;
  }
}

function tokenFor(sub, role, extra = {}) {
  return jwt.sign({ sub, role, tokenType: "access", ...extra }, env.JWT_SECRET, {
    expiresIn: "10m",
    jwtid: newJti(),
  });
}

describe("Authz / CSRF guards", () => {
  it("mutating API without CSRF returns 403", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Content-Type", "application/json")
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.status).toBe("error");
  });

  it("refresh token type is rejected by assertAccessJwt (socket parity)", async () => {
    const result = await assertAccessJwt({ sub: "1", tokenType: "refresh", jti: "x" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_token_type");
  });
});

describe.skipIf(!dbReady || !studentId || !offering)("Course IDOR guards (database)", () => {
  it("student cannot read teacher gradebook for their own offering", async () => {
    const res = await request(app)
      .get(`/api/gradebook/${offering.id}`)
      .set("Authorization", `Bearer ${tokenFor(studentId, "STUDENT")}`);
    expect([403, 404]).toContain(res.status);
  });

  it.skipIf(!foreignOffering)(
    "student cannot read feed/resources for an offering they are not in",
    async () => {
      const token = tokenFor(studentId, "STUDENT");
      for (const path of [
        `/api/course-feed/${foreignOffering.id}`,
        `/api/resources/${foreignOffering.id}`,
        `/api/roster/${foreignOffering.id}`,
      ]) {
        const res = await request(app).get(path).set("Authorization", `Bearer ${token}`);
        expect([403, 404]).toContain(res.status);
      }
    }
  );
});

describe.skipIf(!dbReady || !teacherId)("Token revocation (database)", () => {
  it("revoked access jti is rejected by HTTP auth", async () => {
    const jti = newJti();
    const token = jwt.sign(
      { sub: teacherId, role: "TEACHER", tokenType: "access" },
      env.JWT_SECRET,
      { expiresIn: "10m", jwtid: jti }
    );
    await revokeJti(jti, new Date(Date.now() + 10 * 60 * 1000), {
      userId: teacherId,
      reason: "test_revoke",
    });

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.status).toBe("error");

    const socketCheck = await assertAccessJwt({
      sub: String(teacherId),
      tokenType: "access",
      jti,
    });
    expect(socketCheck).toEqual({ ok: false, reason: "revoked" });
  });
});
