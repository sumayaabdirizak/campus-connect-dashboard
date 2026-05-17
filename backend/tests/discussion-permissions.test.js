import { describe, it, expect } from "vitest";
import {
  PERMISSION_BITS,
  PERMISSION_ADMINISTRATOR,
  hasPermission,
  combine,
  mapGlobalRoleToSystemRoleKey,
  SYSTEM_ROLE_KEYS,
} from "../src/features/discussions/permissions.js";

describe("hasPermission", () => {
  it("grants any bit when ADMINISTRATOR mask is present", () => {
    const mask = PERMISSION_ADMINISTRATOR | 0n;
    expect(hasPermission(mask, PERMISSION_BITS.MANAGE_SERVER)).toBe(true);
    expect(hasPermission(mask, PERMISSION_BITS.SEND_MESSAGES)).toBe(true);
  });

  it("checks individual bits", () => {
    const mask = PERMISSION_BITS.VIEW_CHANNEL | PERMISSION_BITS.SEND_MESSAGES;
    expect(hasPermission(mask, PERMISSION_BITS.VIEW_CHANNEL)).toBe(true);
    expect(hasPermission(mask, PERMISSION_BITS.SEND_MESSAGES)).toBe(true);
    expect(hasPermission(mask, PERMISSION_BITS.MANAGE_SERVER)).toBe(false);
  });

  it("treats nullish mask as zero", () => {
    expect(hasPermission(null, PERMISSION_BITS.VIEW_CHANNEL)).toBe(false);
    expect(hasPermission(undefined, PERMISSION_BITS.VIEW_CHANNEL)).toBe(false);
  });
});

describe("combine", () => {
  it("ORs bigint masks", () => {
    const a = PERMISSION_BITS.VIEW_CHANNEL;
    const b = PERMISSION_BITS.SEND_MESSAGES;
    expect(combine(a, b)).toBe(a | b);
  });
});

describe("mapGlobalRoleToSystemRoleKey", () => {
  it("maps known global roles", () => {
    expect(mapGlobalRoleToSystemRoleKey("STUDENT")).toBe(SYSTEM_ROLE_KEYS.STUDENT);
    expect(mapGlobalRoleToSystemRoleKey("LECTURER")).toBe(SYSTEM_ROLE_KEYS.LECTURER);
    expect(mapGlobalRoleToSystemRoleKey("TEACHER")).toBe(SYSTEM_ROLE_KEYS.LECTURER);
    expect(mapGlobalRoleToSystemRoleKey("DEAN")).toBe(SYSTEM_ROLE_KEYS.DEAN);
    expect(mapGlobalRoleToSystemRoleKey("FACULTY_ADMIN")).toBe(SYSTEM_ROLE_KEYS.FACULTY_ADMIN);
    expect(mapGlobalRoleToSystemRoleKey("SUPER_ADMIN")).toBe(SYSTEM_ROLE_KEYS.FACULTY_ADMIN);
  });

  it("returns null for unknown roles", () => {
    expect(mapGlobalRoleToSystemRoleKey("GUEST")).toBe(null);
    expect(mapGlobalRoleToSystemRoleKey("")).toBe(null);
  });
});
