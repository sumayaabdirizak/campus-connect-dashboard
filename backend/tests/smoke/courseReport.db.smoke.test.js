import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

const seedOffering = dbReady
  ? await prisma.courseOffering.findFirst({
      where: { teacherId: { not: null } },
      select: { id: true, sectionId: true, teacherId: true },
    })
  : null;

const seedTeacher = seedOffering
  ? await prisma.user.findUnique({
      where: { id: seedOffering.teacherId },
      select: { email: true },
    })
  : null;

const seedEnrolledStudent = seedOffering
  ? await prisma.studentRegistration
      .findFirst({
        where: { batchSectionId: seedOffering.sectionId },
        select: { student: { select: { id: true, email: true } } },
      })
      .then((r) => r?.student ?? null)
  : null;

// A student NOT enrolled in seedOffering's section, to confirm the report
// endpoint doesn't leak another student's data across offerings.
const seedOutsideStudent = seedEnrolledStudent
  ? await prisma.user.findFirst({
      where: {
        status: "ACTIVE",
        role: { name: "STUDENT" },
        id: { not: seedEnrolledStudent.id },
        studentRegistrations: { none: { batchSectionId: seedOffering.sectionId } },
      },
      select: { email: true },
    })
  : null;

const SEED_PASSWORD = "password123";
const ready = dbReady && seedOffering && seedTeacher;

describe.skipIf(!ready)("Course report smoke (database)", () => {
  it("teacher can load the class report for an offering they teach", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: seedTeacher.email, password: SEED_PASSWORD });
    expect(login.status).toBe(200);

    const res = await agent.get(`/api/gradebook/${seedOffering.id}/report`);
    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeTruthy();
    expect(Array.isArray(res.body.performanceDistribution)).toBe(true);
    expect(Array.isArray(res.body.atRiskStudents)).toBe(true);
    expect(typeof res.body.studentCount).toBe("number");
  });

  it.skipIf(!seedEnrolledStudent)(
    "enrolled student can load their own report for the offering",
    async () => {
      const agent = request.agent(app);
      const login = await agent
        .post("/api/auth/login")
        .send({ email: seedEnrolledStudent.email, password: SEED_PASSWORD });
      expect(login.status).toBe(200);

      const res = await agent.get(`/api/gradebook/${seedOffering.id}/report/me`);
      expect(res.status).toBe(200);
      expect(res.body.kpis).toBeTruthy();
      expect(Array.isArray(res.body.performanceDistribution)).toBe(true);
      // Personal report shape only — never exposes other students.
      expect(res.body.atRiskStudents).toBeUndefined();
    }
  );

  it.skipIf(!seedOutsideStudent)(
    "a student NOT enrolled in the offering is forbidden from its report",
    async () => {
      const agent = request.agent(app);
      const login = await agent
        .post("/api/auth/login")
        .send({ email: seedOutsideStudent.email, password: SEED_PASSWORD });
      expect(login.status).toBe(200);

      const res = await agent.get(`/api/gradebook/${seedOffering.id}/report/me`);
      expect(res.status).toBe(403);
    }
  );
});
