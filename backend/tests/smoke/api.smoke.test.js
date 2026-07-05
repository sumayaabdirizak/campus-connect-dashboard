import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("API smoke", () => {
  it("GET /health returns ok status shape", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("ok");
    expect(res.body).toHaveProperty("db");
  });

  it("GET /api/auth/csrf issues a CSRF token", async () => {
    const res = await request(app).get("/api/auth/csrf");
    expect(res.status).toBe(200);
    expect(typeof res.body.csrfToken).toBe("string");
    expect(res.body.csrfToken.length).toBeGreaterThan(0);
  });

  it("POST /api/auth/login rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("student portal course list requires authentication", async () => {
    const res = await request(app).get("/api/student-portal/my-courses");
    expect(res.status).toBe(401);
    expect(res.body.status).toBe("error");
  });

  it("course offering routes require authentication", async () => {
    const res = await request(app).get("/api/course-offerings/1");
    expect(res.status).toBe(401);
    expect(res.body.status).toBe("error");
  });

  it("quiz routes require authentication", async () => {
    const res = await request(app).get("/api/quizzes/1");
    expect(res.status).toBe(401);
    expect(res.body.status).toBe("error");
  });
});
