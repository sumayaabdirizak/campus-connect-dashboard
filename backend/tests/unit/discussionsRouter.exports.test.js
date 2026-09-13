import { describe, it, expect } from "vitest";

/**
 * Catches ESM export/wiring breaks in the discussions mount tree
 * (e.g. missing serversRouter) before they take down `npm run dev`.
 */
describe("discussions router module graph", () => {
  it("loads discussions + servers routers with callable default/named exports", async () => {
    const discussions = await import("../../src/router/discussions/discussions.js");
    const servers = await import("../../src/router/discussions/servers.js");

    expect(typeof discussions.default).toBe("function");
    expect(typeof servers.serversRouter).toBe("function");
    expect(servers.default).toBe(servers.serversRouter);
  });
});
