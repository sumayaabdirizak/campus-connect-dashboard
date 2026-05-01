import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";
import { signTestAccessToken } from "./helpers/signTestAccessToken.js";

describe("JWT access payload shape", () => {
  it("includes role and facultyId for a dean-shaped token", () => {
    const token = signTestAccessToken({
      sub: 1,
      role: "DEAN",
      facultyId: 42,
      email: "dean@example.com",
      full_name: "Dean",
    });
    const payload = jwt.verify(token, env.JWT_SECRET);
    expect(payload.role).toBe("DEAN");
    expect(payload.facultyId).toBe(42);
    expect(payload.sub).toBe(1);
    expect(payload.tokenType).toBe("access");
  });

  it("includes null facultyId for non-dean roles", () => {
    const token = signTestAccessToken({
      sub: 99,
      role: "STUDENT",
      facultyId: null,
    });
    const payload = jwt.verify(token, env.JWT_SECRET);
    expect(payload.role).toBe("STUDENT");
    expect(payload.facultyId).toBeNull();
  });

  it("rejects expired tokens on verify", () => {
    const token = signTestAccessToken({ sub: 1, role: "STUDENT" }, { expiresIn: "-1s" });
    expect(() => jwt.verify(token, env.JWT_SECRET)).toThrow();
  });
});
