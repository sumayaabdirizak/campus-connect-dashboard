import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";

const healthRes = await request(app).get("/health");
const dbReady = healthRes.status === 200 && healthRes.body.db === true;

const seedStudent = dbReady
  ? await prisma.user.findFirst({
      where: { status: "ACTIVE", role: { name: "STUDENT" } },
      select: { email: true },
    })
  : null;

const seedOffering = dbReady
  ? await prisma.courseOffering.findFirst({ select: { id: true } })
  : null;

const SEED_PASSWORD = "password123";

describe.skipIf(!dbReady)("API smoke (database)", () => {
  it("POST /api/auth/login succeeds for seeded super admin", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "super.admin@university.edu", password: SEED_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user?.role).toBe("SUPER_ADMIN");
    expect(res.body.csrfToken).toBeTruthy();
    expect(res.headers["set-cookie"]?.join(";")).toMatch(/auth_token=/);
  });

  it("cookie session can read GET /api/users/me", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: "super.admin@university.edu", password: SEED_PASSWORD });

    expect(login.status).toBe(200);

    const me = await agent.get("/api/users/me");
    expect(me.status).toBe(200);
    expect(me.body.email).toBe("super.admin@university.edu");
  });

  it.skipIf(!seedStudent)("student can list enrolled courses", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: seedStudent.email, password: SEED_PASSWORD });

    expect(login.status).toBe(200);

    const courses = await agent.get("/api/student-portal/my-courses");
    expect(courses.status).toBe(200);
    expect(courses.body.success).toBe(true);
    expect(Array.isArray(courses.body.offerings)).toBe(true);
  });

  it.skipIf(!seedStudent || !seedOffering)("student can list quizzes for a course offering", async () => {
    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: seedStudent.email, password: SEED_PASSWORD });

    expect(login.status).toBe(200);

    const quizzes = await agent.get(`/api/quizzes/${seedOffering.id}`);
    expect(quizzes.status).toBe(200);
    expect(Array.isArray(quizzes.body)).toBe(true);
  });
});
