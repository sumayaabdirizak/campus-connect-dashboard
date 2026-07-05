import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/utils/password.js";

describe("utils/password", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("campus-connect-test");
    expect(hash).not.toBe("campus-connect-test");
    expect(await verifyPassword("campus-connect-test", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});
