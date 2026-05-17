import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_BASE_URL = process.env.E2E_API_BASE_URL || "http://localhost:4000/api";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "password123";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseSetCookie(cookies) {
  const jar = {};
  for (const cookie of cookies || []) {
    const [pair] = cookie.split(";");
    const [name, ...rest] = pair.split("=");
    jar[name.trim()] = rest.join("=");
  }
  return jar;
}

function getSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

async function login(email) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  const body = await response.json().catch(() => ({}));
  assert(response.ok, `Login failed for ${email}`);
  const cookieJar = parseSetCookie(getSetCookies(response));
  return {
    user: body.user,
    authToken: cookieJar.auth_token,
    csrfToken: body.csrfToken || cookieJar.csrf_token,
  };
}

async function createAnnouncement(actor, payload) {
  const response = await fetch(`${API_BASE_URL}/announcements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${actor.authToken}`,
      "Content-Type": "application/json",
      "X-CSRF-Token": actor.csrfToken,
      Cookie: `csrf_token=${actor.csrfToken}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function main() {
  const deanUser = await prisma.user.findFirst({
    where: { role: { name: "DEAN" }, deanProfile: { isNot: null } },
    include: { deanProfile: true },
  });
  const superAdminUser = await prisma.user.findFirst({
    where: { role: { name: "SUPER_ADMIN" } },
  });
  assert(deanUser?.deanProfile?.facultyId, "Missing dean user/faculty");
  assert(superAdminUser, "Missing super admin user");

  const deanFacultyId = deanUser.deanProfile.facultyId;
  const otherFaculty = await prisma.faculty.findFirst({
    where: { id: { not: deanFacultyId } },
    orderBy: { id: "asc" },
  });
  assert(otherFaculty, "Missing other faculty");

  const outsideDepartment = await prisma.department.findFirst({
    where: { facultyId: otherFaculty.id },
    orderBy: { id: "asc" },
  });
  assert(outsideDepartment, "Missing outside department");

  const insideDepartment = await prisma.department.findFirst({
    where: { facultyId: deanFacultyId },
    orderBy: { id: "asc" },
  });
  assert(insideDepartment, "Missing inside department");

  const dean = await login(deanUser.email);
  const superAdmin = await login(superAdminUser.email);

  const t1 = await createAnnouncement(dean, {
    title: `Security Test 1 ${Date.now()}`,
    content: "Dean cross faculty should fail",
    priority: "important",
    targetType: "FACULTY",
    facultyId: otherFaculty.id,
  });
  assert(t1.response.status === 403, `Expected 403, got ${t1.response.status}`);
  console.log("[PASS] DEAN target other faculty -> 403");

  const t2 = await createAnnouncement(dean, {
    title: `Security Test 2 ${Date.now()}`,
    content: "Dean outside department should fail",
    priority: "important",
    targetType: "DEPARTMENT",
    facultyId: deanFacultyId,
    departmentId: outsideDepartment.id,
  });
  assert(t2.response.status === 403, `Expected 403, got ${t2.response.status}`);
  console.log("[PASS] DEAN outside department -> 403");

  const t3 = await createAnnouncement(dean, {
    title: `Security Test 3 ${Date.now()}`,
    content: "Dean valid announcement",
    priority: "normal",
    targetType: "DEPARTMENT",
    departmentId: insideDepartment.id,
  });
  assert(t3.response.ok, `Expected dean success, got ${t3.response.status}`);
  console.log("[PASS] DEAN valid within faculty -> SUCCESS");

  const t4 = await createAnnouncement(superAdmin, {
    title: `Security Test 4 ${Date.now()}`,
    content: "Super admin cross faculty",
    priority: "normal",
    targetType: "FACULTY",
    facultyId: otherFaculty.id,
  });
  assert(t4.response.ok, `Expected super admin success, got ${t4.response.status}`);
  console.log("[PASS] SUPER_ADMIN cross faculty -> SUCCESS");
}

main()
  .catch((error) => {
    console.error("[FAIL] announcement-security-tests", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
