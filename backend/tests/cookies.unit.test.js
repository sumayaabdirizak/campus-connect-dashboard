import { describe, it, expect } from "vitest";
import { readCookie, readCookieFromHeader } from "../src/utils/cookies.js";

describe("readCookieFromHeader", () => {
  it("returns null when the header is missing/empty", () => {
    expect(readCookieFromHeader(undefined, "auth_token")).toBeNull();
    expect(readCookieFromHeader(null, "auth_token")).toBeNull();
    expect(readCookieFromHeader("", "auth_token")).toBeNull();
  });

  it("reads a single cookie value", () => {
    expect(readCookieFromHeader("auth_token=abc123", "auth_token")).toBe("abc123");
  });

  it("reads the right value among several cookies (with spaces)", () => {
    const header = "theme=dark; auth_token=xyz; csrf_token=tok";
    expect(readCookieFromHeader(header, "auth_token")).toBe("xyz");
    expect(readCookieFromHeader(header, "csrf_token")).toBe("tok");
  });

  it("returns null for an absent key", () => {
    expect(readCookieFromHeader("a=1; b=2", "missing")).toBeNull();
  });

  it("URL-decodes the value and preserves '=' inside it", () => {
    expect(readCookieFromHeader("token=a%20b", "token")).toBe("a b");
    // base64/JWT values can contain '='
    expect(readCookieFromHeader("t=aGVsbG8=", "t")).toBe("aGVsbG8=");
  });
});

describe("readCookie", () => {
  it("reads from req.headers.cookie", () => {
    const req = { headers: { cookie: "auth_token=fromreq" } };
    expect(readCookie(req, "auth_token")).toBe("fromreq");
  });

  it("is null-safe when req or headers are missing", () => {
    expect(readCookie(undefined, "x")).toBeNull();
    expect(readCookie({}, "x")).toBeNull();
    expect(readCookie({ headers: {} }, "x")).toBeNull();
  });
});
