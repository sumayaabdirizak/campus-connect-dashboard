import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    revokedToken: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { prisma } from "../src/db/prisma.js";
import { newJti, isJtiRevoked, revokeJti } from "../src/utils/tokenRevocation.js";

describe("newJti", () => {
  it("produces a non-empty string", () => {
    expect(typeof newJti()).toBe("string");
    expect(newJti().length).toBeGreaterThan(0);
  });
  it("produces unique values", () => {
    expect(newJti()).not.toBe(newJti());
  });
});

describe("isJtiRevoked", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns false (no DB hit) for a falsy jti", async () => {
    expect(await isJtiRevoked("")).toBe(false);
    expect(await isJtiRevoked(undefined)).toBe(false);
    expect(prisma.revokedToken.findUnique).not.toHaveBeenCalled();
  });

  it("true when a deny-list row exists", async () => {
    prisma.revokedToken.findUnique.mockResolvedValueOnce({ jti: "abc" });
    expect(await isJtiRevoked("abc")).toBe(true);
    expect(prisma.revokedToken.findUnique).toHaveBeenCalledWith({
      where: { jti: "abc" },
      select: { jti: true },
    });
  });

  it("false when no row exists", async () => {
    prisma.revokedToken.findUnique.mockResolvedValueOnce(null);
    expect(await isJtiRevoked("missing")).toBe(false);
  });
});

describe("revokeJti", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is a no-op for a falsy jti", async () => {
    await revokeJti("", new Date());
    expect(prisma.revokedToken.upsert).not.toHaveBeenCalled();
  });

  it("upserts the jti with expiry + metadata", async () => {
    prisma.revokedToken.upsert.mockResolvedValueOnce({});
    const exp = new Date("2030-01-01T00:00:00Z");
    await revokeJti("jti-1", exp, { userId: 42, reason: "logout" });
    expect(prisma.revokedToken.upsert).toHaveBeenCalledWith({
      where: { jti: "jti-1" },
      update: {},
      create: { jti: "jti-1", userId: 42, reason: "logout", expiresAt: exp },
    });
  });

  it("defaults userId=null and reason='logout' when meta is omitted", async () => {
    prisma.revokedToken.upsert.mockResolvedValueOnce({});
    const exp = new Date("2030-01-01T00:00:00Z");
    await revokeJti("jti-2", exp);
    expect(prisma.revokedToken.upsert).toHaveBeenCalledWith({
      where: { jti: "jti-2" },
      update: {},
      create: { jti: "jti-2", userId: null, reason: "logout", expiresAt: exp },
    });
  });

  it("is best-effort: swallows DB errors instead of throwing", async () => {
    prisma.revokedToken.upsert.mockRejectedValueOnce(new Error("db down"));
    await expect(revokeJti("jti-3", new Date())).resolves.toBeUndefined();
  });
});
