import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("Standardized API errors", () => {
  it("returns consistent 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist-sprint2");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      status: "error",
      message: "Route not found",
    });
    expect(typeof res.body.details === "string" || res.body.details === null).toBe(true);
  });

  it("returns 400 with Joi validation details for invalid login body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email", password: "" });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.message).toBe("Validation failed");
    expect(Array.isArray(res.body.details)).toBe(true);
  });
});
