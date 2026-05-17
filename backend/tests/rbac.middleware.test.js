import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/config/env.js";
import { signTestAccessToken } from "./helpers/signTestAccessToken.js";

describe("Auth & RBAC (HTTP)", () => {
  let deanUserId;
  let deanFacultyId;
  let otherFacultyDeanUserId;
  let otherDeanFacultyId;
  let studentInDeanFacultyId;
  let superAdminId;

  beforeAll(async () => {
    const dean = await prisma.user.findUnique({
      where: { email: "dean.computing@university.edu" },
      select: { id: true },
    });
    const otherDean = await prisma.user.findUnique({
      where: { email: "dean.sciences@university.edu" },
      select: { id: true },
    });
    const student = await prisma.user.findFirst({
      where: {
        email: "student.bsc-cs-b1.section-a.1@university.edu",
        role: { name: "STUDENT" },
      },
      select: { id: true },
    });
    const admin = await prisma.user.findUnique({
      where: { email: "super.admin@university.edu" },
      select: { id: true },
    });

    if (!dean || !otherDean || !student || !admin) {
      throw new Error(
        "Seed data missing. Run `npm run prisma:seed` (expects dean.computing@…, dean.sciences@…, a CS student, super.admin@…)."
      );
    }

    deanUserId = dean.id;
    otherFacultyDeanUserId = otherDean.id;
    studentInDeanFacultyId = student.id;
    superAdminId = admin.id;

    const deanProf = await prisma.deanProfile.findUnique({
      where: { userId: deanUserId },
      select: { facultyId: true },
    });
    const otherProf = await prisma.deanProfile.findUnique({
      where: { userId: otherFacultyDeanUserId },
      select: { facultyId: true },
    });
    deanFacultyId = deanProf?.facultyId ?? null;
    otherDeanFacultyId = otherProf?.facultyId ?? null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 without Authorization for a protected route", async () => {
    const res = await request(app).get("/api/dean/users");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed Bearer token", async () => {
    const res = await request(app).get("/api/dean/users").set("Authorization", "Bearer not-a-jwt");
    expect(res.status).toBe(401);
  });

  it("returns 401 for an expired access token", async () => {
    const token = signTestAccessToken(
      { sub: deanUserId, role: "DEAN", facultyId: deanFacultyId },
      { expiresIn: "-10s" }
    );
    const res = await request(app).get("/api/dean/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("denies STUDENT access to dean endpoints (403)", async () => {
    const token = signTestAccessToken({ sub: studentInDeanFacultyId, role: "STUDENT" });
    const res = await request(app).get("/api/dean/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows DEAN to list faculty-scoped users (200)", async () => {
    const token = signTestAccessToken({ sub: deanUserId, role: "DEAN", facultyId: deanFacultyId });
    const res = await request(app).get("/api/dean/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("denies DEAN access to a user outside their faculty (403)", async () => {
    const token = signTestAccessToken({ sub: deanUserId, role: "DEAN", facultyId: deanFacultyId });
    const res = await request(app)
      .get(`/api/dean/users/${otherFacultyDeanUserId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows DEAN to read a student in their faculty (200)", async () => {
    const token = signTestAccessToken({ sub: deanUserId, role: "DEAN", facultyId: deanFacultyId });
    const res = await request(app)
      .get(`/api/dean/users/${studentInDeanFacultyId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("allows SUPER_ADMIN to read faculties (200)", async () => {
    const token = signTestAccessToken({ sub: superAdminId, role: "SUPER_ADMIN" });
    const res = await request(app).get("/api/faculties").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("denies STUDENT access to lecturer portal (403)", async () => {
    const token = signTestAccessToken({ sub: studentInDeanFacultyId, role: "STUDENT" });
    const res = await request(app)
      .get("/api/lecturer-portal/my-assignments")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("denies TEACHER access to student portal (403)", async () => {
    const teacher = await prisma.user.findFirst({
      where: { email: "lecturer.cs1@university.edu" },
      select: { id: true },
    });
    expect(teacher).toBeTruthy();
    const token = signTestAccessToken({ sub: teacher.id, role: "TEACHER" });
    const res = await request(app)
      .get("/api/student-portal/my-courses")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns 401 when a refresh-shaped token is sent as a Bearer access token", async () => {
    const refreshLike = jwt.sign({ sub: superAdminId, tokenType: "refresh" }, env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const res = await request(app).get("/api/faculties").set("Authorization", `Bearer ${refreshLike}`);
    expect(res.status).toBe(401);
  });

  it("denies STUDENT read on a course offering outside their section (403)", async () => {
    const offering = await prisma.courseOffering.findFirst({
      where: {
        section: {
          batch: { program: { department: { faculty: { code: "FS" } } } },
        },
      },
      select: { id: true },
    });
    expect(offering).toBeTruthy();
    const token = signTestAccessToken({ sub: studentInDeanFacultyId, role: "STUDENT" });
    const res = await request(app)
      .get(`/api/course-offerings/${offering.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows STUDENT read on a course offering for their registered section (200)", async () => {
    const reg = await prisma.studentRegistration.findFirst({
      where: { studentId: studentInDeanFacultyId },
      select: { batchSectionId: true },
    });
    expect(reg).toBeTruthy();
    const offering = await prisma.courseOffering.findFirst({
      where: { sectionId: reg.batchSectionId },
      select: { id: true },
    });
    expect(offering).toBeTruthy();
    const token = signTestAccessToken({ sub: studentInDeanFacultyId, role: "STUDENT" });
    const res = await request(app)
      .get(`/api/course-offerings/${offering.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("denies TEACHER read on an offering they are not assigned to teach (403)", async () => {
    const offering = await prisma.courseOffering.findFirst({
      where: { teacherId: { not: null } },
      select: { id: true, teacherId: true },
    });
    expect(offering).toBeTruthy();
    const wrongTeacher = await prisma.user.findFirst({
      where: { id: { not: offering.teacherId }, role: { name: "TEACHER" } },
      select: { id: true },
    });
    expect(wrongTeacher).toBeTruthy();
    const token = signTestAccessToken({ sub: wrongTeacher.id, role: "TEACHER" });
    const res = await request(app)
      .get(`/api/course-offerings/${offering.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows FACULTY_ADMIN to read a course offering in their faculty (200)", async () => {
    const fa = await prisma.user.findUnique({
      where: { email: "faculty.admin@university.edu" },
      select: { id: true },
    });
    const prof = fa
      ? await prisma.facultyAdminProfile.findUnique({
          where: { user_id: fa.id },
          select: { faculty_id: true },
        })
      : null;
    if (!fa || !prof) {
      console.warn(
        "[rbac] Skipping FACULTY_ADMIN offering test: run `npm run prisma:migrate:deploy` and `npm run prisma:seed` (expects faculty.admin@university.edu)."
      );
      return;
    }
    const offering = await prisma.courseOffering.findFirst({
      where: {
        section: { batch: { program: { department: { facultyId: prof.faculty_id } } } },
      },
      select: { id: true },
    });
    expect(offering).toBeTruthy();
    const token = signTestAccessToken({
      sub: fa.id,
      role: "FACULTY_ADMIN",
      facultyId: prof.faculty_id,
    });
    const res = await request(app)
      .get(`/api/course-offerings/${offering.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("denies DEAN read on a course offering in another faculty when JWT facultyId mismatches (403)", async () => {
    const offering = await prisma.courseOffering.findFirst({
      where: {
        section: { batch: { program: { department: { facultyId: otherDeanFacultyId } } } },
      },
      select: { id: true },
    });
    expect(offering).toBeTruthy();
    const token = signTestAccessToken({
      sub: deanUserId,
      role: "DEAN",
      facultyId: deanFacultyId,
    });
    const res = await request(app)
      .get(`/api/course-offerings/${offering.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
