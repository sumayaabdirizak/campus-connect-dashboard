import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client so these run with no database. courseOfferingAccess
// and facultyAccess both import this same module id, so one mock covers both.
vi.mock("../src/db/prisma.js", () => ({
  prisma: {
    studentRegistration: { findFirst: vi.fn() },
  },
}));

import { prisma } from "../src/db/prisma.js";
import {
  offeringFacultyId,
  canSocketUserReadOffering,
  canAccessOfferingRead,
  canManageOfferingContent,
} from "../src/utils/courseOfferingAccess.js";

function makeOffering({ teacherId = 100, sectionId = 50, facultyId = 7 } = {}) {
  return {
    teacherId,
    sectionId,
    section: { batch: { program: { department: { facultyId } } } },
  };
}

describe("offeringFacultyId", () => {
  it("digs out the nested faculty id", () => {
    expect(offeringFacultyId(makeOffering({ facultyId: 12 }))).toBe(12);
  });
  it("returns null when the chain is incomplete", () => {
    expect(offeringFacultyId({})).toBeNull();
    expect(offeringFacultyId(null)).toBeNull();
  });
});

describe("canSocketUserReadOffering (pure, no DB)", () => {
  const offering = makeOffering({ teacherId: 100, sectionId: 50, facultyId: 7 });

  it("returns false without a role or offering", () => {
    expect(canSocketUserReadOffering(null, offering)).toBe(false);
    expect(canSocketUserReadOffering({ role: "STUDENT" }, null)).toBe(false);
  });

  it("SUPER_ADMIN can read any offering", () => {
    expect(canSocketUserReadOffering({ id: 1, role: "SUPER_ADMIN" }, offering)).toBe(true);
  });

  it("DEAN/FACULTY_ADMIN can read only within their faculties", () => {
    expect(canSocketUserReadOffering({ id: 2, role: "DEAN", facultyIds: [7] }, offering)).toBe(true);
    expect(canSocketUserReadOffering({ id: 2, role: "DEAN", facultyIds: [8] }, offering)).toBe(false);
    expect(
      canSocketUserReadOffering({ id: 3, role: "FACULTY_ADMIN", facultyIds: [1, 7] }, offering)
    ).toBe(true);
  });

  it("TEACHER can read only their own offering", () => {
    expect(canSocketUserReadOffering({ id: 100, role: "TEACHER" }, offering)).toBe(true);
    expect(canSocketUserReadOffering({ id: 101, role: "TEACHER" }, offering)).toBe(false);
  });

  it("STUDENT can read only offerings for a section they're enrolled in", () => {
    expect(canSocketUserReadOffering({ id: 5, role: "STUDENT", sectionIds: [50] }, offering)).toBe(true);
    expect(canSocketUserReadOffering({ id: 5, role: "STUDENT", sectionIds: [51] }, offering)).toBe(false);
    expect(canSocketUserReadOffering({ id: 5, role: "STUDENT", sectionIds: [] }, offering)).toBe(false);
  });

  it("coerces string ids (teacher / faculty / section)", () => {
    expect(canSocketUserReadOffering({ id: "100", role: "TEACHER" }, offering)).toBe(true);
    expect(canSocketUserReadOffering({ id: 2, role: "DEAN", facultyIds: ["7"] }, offering)).toBe(true);
    expect(canSocketUserReadOffering({ id: 5, role: "STUDENT", sectionIds: ["50"] }, offering)).toBe(true);
  });

  it("denies an unknown role", () => {
    expect(canSocketUserReadOffering({ id: 9, role: "GUEST" }, offering)).toBe(false);
  });
});

describe("canAccessOfferingRead (HTTP req.user shape, prisma-mocked)", () => {
  beforeEach(() => vi.clearAllMocks());
  const offering = makeOffering({ teacherId: 100, sectionId: 50, facultyId: 7 });

  it("SUPER_ADMIN → true", async () => {
    expect(await canAccessOfferingRead({ role: "SUPER_ADMIN" }, offering)).toBe(true);
  });

  it("TEACHER matches on sub === offering.teacherId", async () => {
    expect(await canAccessOfferingRead({ role: "TEACHER", sub: 100 }, offering)).toBe(true);
    expect(await canAccessOfferingRead({ role: "TEACHER", sub: 999 }, offering)).toBe(false);
  });

  it("DEAN matches on faculty via getAuthFacultyId", async () => {
    expect(await canAccessOfferingRead({ role: "DEAN", facultyId: 7 }, offering)).toBe(true);
    expect(await canAccessOfferingRead({ role: "DEAN", facultyId: 8 }, offering)).toBe(false);
  });

  it("STUDENT enrolled → true (delegates to studentInSection)", async () => {
    prisma.studentRegistration.findFirst.mockResolvedValueOnce({ id: 1 });
    expect(await canAccessOfferingRead({ role: "STUDENT", sub: 5 }, offering)).toBe(true);
    expect(prisma.studentRegistration.findFirst).toHaveBeenCalledWith({
      where: { studentId: 5, batchSectionId: 50 },
    });
  });

  it("STUDENT not enrolled → false", async () => {
    prisma.studentRegistration.findFirst.mockResolvedValueOnce(null);
    expect(await canAccessOfferingRead({ role: "STUDENT", sub: 6 }, offering)).toBe(false);
  });

  it("returns false for no user / no offering", async () => {
    expect(await canAccessOfferingRead(null, offering)).toBe(false);
    expect(await canAccessOfferingRead({ role: "TEACHER", sub: 1 }, null)).toBe(false);
  });
});

describe("canManageOfferingContent (no STUDENT path)", () => {
  const offering = makeOffering({ teacherId: 100, sectionId: 50, facultyId: 7 });
  it("owning TEACHER can manage; a STUDENT cannot", async () => {
    expect(await canManageOfferingContent({ role: "TEACHER", sub: 100 }, offering)).toBe(true);
    expect(await canManageOfferingContent({ role: "STUDENT", sub: 5 }, offering)).toBe(false);
  });
  it("DEAN of the faculty can manage", async () => {
    expect(await canManageOfferingContent({ role: "DEAN", facultyId: 7 }, offering)).toBe(true);
  });
});
