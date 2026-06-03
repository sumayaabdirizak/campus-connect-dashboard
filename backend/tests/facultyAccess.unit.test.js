import { describe, it, expect } from "vitest";
import {
  getAuthFacultyId,
  checkFacultyAccess,
  buildNestedFacultyFilter,
} from "../src/utils/facultyAccess.js";

describe("getAuthFacultyId", () => {
  it("returns null for missing user / missing faculty", () => {
    expect(getAuthFacultyId(null)).toBeNull();
    expect(getAuthFacultyId({})).toBeNull();
    expect(getAuthFacultyId({ facultyId: "" })).toBeNull();
  });

  it("reads facultyId or faculty_id and coerces to Number", () => {
    expect(getAuthFacultyId({ facultyId: "7" })).toBe(7);
    expect(getAuthFacultyId({ faculty_id: 9 })).toBe(9);
  });
});

describe("checkFacultyAccess", () => {
  it("SUPER_ADMIN may act on any faculty", () => {
    expect(checkFacultyAccess({ role: "SUPER_ADMIN" }, 3)).toBe(true);
  });

  it("DEAN / FACULTY_ADMIN only on their own faculty", () => {
    expect(checkFacultyAccess({ role: "DEAN", facultyId: 3 }, 3)).toBe(true);
    expect(checkFacultyAccess({ role: "DEAN", facultyId: 3 }, 4)).toBe(false);
    expect(checkFacultyAccess({ role: "FACULTY_ADMIN", facultyId: 5 }, 5)).toBe(true);
  });

  it("denies a DEAN with no faculty set", () => {
    expect(checkFacultyAccess({ role: "DEAN" }, 3)).toBe(false);
  });

  it("denies other roles outright", () => {
    expect(checkFacultyAccess({ role: "TEACHER", facultyId: 3 }, 3)).toBe(false);
    expect(checkFacultyAccess({ role: "STUDENT", facultyId: 3 }, 3)).toBe(false);
  });
});

describe("buildNestedFacultyFilter", () => {
  it("SUPER_ADMIN gets an unrestricted filter", () => {
    expect(buildNestedFacultyFilter({ role: "SUPER_ADMIN" })).toEqual({});
  });

  it("DEAN scopes to their faculty", () => {
    expect(buildNestedFacultyFilter({ role: "DEAN", facultyId: 8 })).toEqual({
      department: { facultyId: 8 },
    });
  });

  it("DEAN without a faculty gets a deny-all sentinel (-1)", () => {
    expect(buildNestedFacultyFilter({ role: "DEAN" })).toEqual({
      department: { facultyId: -1 },
    });
  });

  it("other roles get a deny-all sentinel (-1)", () => {
    expect(buildNestedFacultyFilter({ role: "STUDENT" })).toEqual({
      department: { facultyId: -1 },
    });
  });
});
