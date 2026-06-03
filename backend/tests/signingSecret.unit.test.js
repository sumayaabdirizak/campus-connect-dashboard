import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mutable mocked env so we can exercise the fail-closed branch (env.JWT_SECRET
// is captured at import time in the real config, so we can't toggle it via
// process.env alone).
const { mockEnv } = vi.hoisted(() => ({ mockEnv: { JWT_SECRET: "jwt-fallback" } }));
vi.mock("../src/config/env.js", () => ({ env: mockEnv }));

import { getSigningSecret } from "../src/utils/signingSecret.js";

describe("getSigningSecret", () => {
  const KEY = "TEST_DEDICATED_SECRET";

  beforeEach(() => {
    mockEnv.JWT_SECRET = "jwt-fallback";
    delete process.env[KEY];
  });
  afterEach(() => {
    delete process.env[KEY];
  });

  it("prefers the dedicated env secret when set", () => {
    process.env[KEY] = "dedicated-value";
    expect(getSigningSecret(KEY)).toBe("dedicated-value");
  });

  it("falls back to JWT_SECRET when the dedicated secret is unset", () => {
    expect(getSigningSecret(KEY)).toBe("jwt-fallback");
  });

  it("ignores an empty dedicated value and uses JWT_SECRET", () => {
    process.env[KEY] = "";
    expect(getSigningSecret(KEY)).toBe("jwt-fallback");
  });

  it("throws (fail-closed) when neither is set — never returns a guessable literal", () => {
    mockEnv.JWT_SECRET = "";
    expect(() => getSigningSecret(KEY)).toThrow(/Missing signing secret/);
  });
});
