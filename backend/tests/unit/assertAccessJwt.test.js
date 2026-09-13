import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/tokenRevocation.js", () => ({
  isJtiRevoked: vi.fn(),
}));

import { isJtiRevoked } from "../../src/utils/tokenRevocation.js";
import { assertAccessJwt } from "../../src/socket/middleware/assertAccessJwt.js";

describe("assertAccessJwt (socket auth parity)", () => {
  beforeEach(() => {
    vi.mocked(isJtiRevoked).mockReset();
  });

  it("rejects non-object payloads", async () => {
    expect(await assertAccessJwt(null)).toEqual({ ok: false, reason: "invalid_payload" });
    expect(await assertAccessJwt("token")).toEqual({ ok: false, reason: "invalid_payload" });
  });

  it("rejects refresh (non-access) token types", async () => {
    expect(await assertAccessJwt({ sub: "1", tokenType: "refresh" })).toEqual({
      ok: false,
      reason: "invalid_token_type",
    });
  });

  it("accepts access tokens without jti", async () => {
    expect(await assertAccessJwt({ sub: "1", tokenType: "access" })).toEqual({ ok: true });
  });

  it("rejects revoked jti", async () => {
    vi.mocked(isJtiRevoked).mockResolvedValue(true);
    expect(await assertAccessJwt({ sub: "1", tokenType: "access", jti: "abc" })).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect(isJtiRevoked).toHaveBeenCalledWith("abc");
  });

  it("accepts non-revoked jti", async () => {
    vi.mocked(isJtiRevoked).mockResolvedValue(false);
    expect(await assertAccessJwt({ sub: "1", tokenType: "access", jti: "abc" })).toEqual({
      ok: true,
    });
  });

  it("fails closed when revocation lookup throws", async () => {
    vi.mocked(isJtiRevoked).mockRejectedValue(new Error("db down"));
    expect(await assertAccessJwt({ sub: "1", jti: "abc" })).toEqual({
      ok: false,
      reason: "revocation_unavailable",
    });
  });
});
