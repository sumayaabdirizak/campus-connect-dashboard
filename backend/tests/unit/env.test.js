import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseCorsOrigins,
  getCorsAllowlist,
  getSocketCorsAllowlist,
} from "../../src/config/env.js";

describe("config/env", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
    delete process.env.SOCKET_CORS_ORIGINS;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("parseCorsOrigins splits and trims comma-separated origins", () => {
    expect(parseCorsOrigins("http://a.com, http://b.com ,http://c.com")).toEqual([
      "http://a.com",
      "http://b.com",
      "http://c.com",
    ]);
  });

  it("getCorsAllowlist prefers CORS_ORIGINS over FRONTEND_URL", () => {
    process.env.CORS_ORIGINS = "http://custom.example";
    process.env.FRONTEND_URL = "http://ignored.example";
    expect(getCorsAllowlist()).toEqual(["http://custom.example"]);
  });

  it("getSocketCorsAllowlist prefers SOCKET_CORS_ORIGINS", () => {
    process.env.SOCKET_CORS_ORIGINS = "http://socket.example";
    process.env.CORS_ORIGINS = "http://http.example";
    expect(getSocketCorsAllowlist()).toEqual(["http://socket.example"]);
  });
});
