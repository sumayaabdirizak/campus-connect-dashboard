import { describe, it, expect } from "vitest";
import {
  parseOverwriteTargetType,
  parseOverwriteTargetId,
  safePermissionBigInt,
  overwriteRowToDto,
} from "../../src/features/discussions/permissionOverwriteUtils.js";

describe("features/discussions/permissionOverwriteUtils", () => {
  it("parses overwrite target type and id", () => {
    expect(parseOverwriteTargetType("role")).toBe("ROLE");
    expect(parseOverwriteTargetType("bad")).toBeNull();
    expect(parseOverwriteTargetId("5")).toBe(5);
    expect(parseOverwriteTargetId("0")).toBeNull();
  });

  it("safePermissionBigInt and overwriteRowToDto format rows", () => {
    expect(safePermissionBigInt("42")).toBe(42n);
    expect(safePermissionBigInt("x")).toBeNull();
    expect(
      overwriteRowToDto({
        id: 1,
        channelId: 2,
        targetType: "ROLE",
        targetId: 3,
        allow: 7n,
        deny: 0n,
      })
    ).toEqual({
      id: 1,
      channelId: 2,
      targetType: "ROLE",
      targetId: 3,
      allow: "7",
      deny: "0",
    });
  });
});
