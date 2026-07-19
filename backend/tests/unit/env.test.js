import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseCorsOrigins,
  getCorsAllowlist,
  getSocketCorsAllowlist,
  parseTtlToSeconds,
  configureTrustProxy,
} from "../../src/config/env.js";

describe("config/env", () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;
    delete process.env.SOCKET_CORS_ORIGINS;
    delete process.env.TRUST_PROXY;
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

  it("parseTtlToSeconds accepts duration suffixes and bare seconds", () => {
    expect(parseTtlToSeconds("15m", 60)).toBe(900);
    expect(parseTtlToSeconds("1h", 60)).toBe(3600);
    expect(parseTtlToSeconds("7d", 60)).toBe(7 * 86400);
    expect(parseTtlToSeconds("90", 60)).toBe(90);
    expect(parseTtlToSeconds("bad", 42)).toBe(42);
  });

  it("configureTrustProxy sets hop count when TRUST_PROXY is set", () => {
    const settings = {};
    const app = { set: (k, v) => { settings[k] = v; } };
    process.env.TRUST_PROXY = "1";
    configureTrustProxy(app);
    expect(settings["trust proxy"]).toBe(1);
  });
});
