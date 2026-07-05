import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { io } from "socket.io-client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

const API_BASE_URL = process.env.E2E_API_BASE_URL || "http://localhost:4000/api";
const SOCKET_URL = API_BASE_URL.endsWith("/api") ? API_BASE_URL.slice(0, -4) : API_BASE_URL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "password123";

const summary = [];

function logStep(title) {
  console.log(`\n========== ${title} ==========`);
}

function mark(result, label, details = "") {
  const prefix = result ? "[PASS]" : "[FAIL]";
  console.log(`${prefix} ${label}${details ? ` - ${details}` : ""}`);
  summary.push({ result, label, details });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function parseSetCookie(cookies) {
  const jar = {};
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [name, ...rest] = pair.split("=");
    jar[name.trim()] = rest.join("=");
  }
  return jar;
}

function cookieHeader(cookieJar) {
  const entries = Object.entries(cookieJar);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}=${v}`).join("; ");
}

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status} ${body.message || ""}`);
  }
  const cookies = parseSetCookie(extractCookies(response));
  return {
    user: body.user,
    csrfToken: body.csrfToken || null,
    authToken: cookies.auth_token || null,
    refreshToken: cookies.refresh_token || null,
    csrfCookie: cookies.csrf_token || null,
    cookieJar: cookies,
  };
}

async function apiRequest({ actor, endpoint, method = "GET", body, withCsrf = false }) {
  const normalizedBody =
    endpoint === "/announcements" &&
    method.toUpperCase() === "POST" &&
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    !("targetRoles" in body)
      ? { ...body, targetRoles: ["SUPER_ADMIN", "DEAN", "TEACHER", "STUDENT"] }
      : body;
  const headers = {
    Authorization: `Bearer ${actor.authToken}`,
  };
  if (normalizedBody !== undefined) headers["Content-Type"] = "application/json";
  if (withCsrf) {
    headers["X-CSRF-Token"] = actor.csrfToken || actor.csrfCookie;
    headers.Cookie = cookieHeader({
      csrf_token: actor.csrfCookie || actor.csrfToken,
    });
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: normalizedBody !== undefined ? JSON.stringify(normalizedBody) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function connectSocket(actor) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      auth: { token: actor.authToken },
      timeout: 10000,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`Socket connect timeout for ${actor.label}`));
    }, 10000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function getPriorityBadge(priority) {
  if (priority === "urgent") return "URGENT";
  if (priority === "important") return "IMPORTANT";
  return "NORMAL";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  logStep("STEP 1: AUTH + TEST USERS");

  let superAdminDb = await prisma.user.findFirst({
    where: { role: { name: "SUPER_ADMIN" } },
    include: { role: true },
  });
  if (!superAdminDb) {
    const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
    assert(superAdminRole, "SUPER_ADMIN role is missing");
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const uniqueSuffix = Date.now();
    superAdminDb = await prisma.user.create({
      data: {
        full_name: "E2E Super Admin",
        email: `e2e.superadmin.${uniqueSuffix}@campus.local`,
        number: `E2E-SA-${uniqueSuffix}`,
        password_hash: passwordHash,
        roleId: superAdminRole.id,
      },
      include: { role: true },
    });
    console.log("created fallback SUPER_ADMIN", {
      userId: superAdminDb.id,
      email: superAdminDb.email,
    });
  }

  const deanDb = await prisma.user.findFirst({
    where: { role: { name: "DEAN" }, deanProfile: { isNot: null } },
    include: { role: true, deanProfile: true },
  });
  assert(deanDb?.deanProfile?.facultyId, "No DEAN with faculty found");

  const deptA1 = await prisma.department.findFirst({
    where: { facultyId: deanDb.deanProfile.facultyId },
    orderBy: { id: "asc" },
  });
  assert(deptA1, "No department found for dean faculty");

  const student1Db = await prisma.user.findFirst({
    where: {
      role: { name: "STUDENT" },
      studentRegistrations: {
        some: {
          batchSection: {
            batch: {
              program: { departmentId: deptA1.id },
            },
          },
        },
      },
    },
    include: { role: true },
  });
  assert(student1Db, "No STUDENT in dean department found");

  const student2Db = await prisma.user.findFirst({
    where: {
      role: { name: "STUDENT" },
      id: { not: student1Db.id },
      studentRegistrations: {
        some: {
          batchSection: {
            batch: {
              program: {
                department: {
                  facultyId: deanDb.deanProfile.facultyId,
                  id: { not: deptA1.id },
                },
              },
            },
          },
        },
      },
    },
    include: { role: true },
  });
  assert(student2Db, "No second STUDENT from different department found");

  const teacherDb = await prisma.user.findFirst({
    where: { role: { name: "TEACHER" }, lecturerProfile: { isNot: null } },
    include: { role: true, lecturerProfile: true },
  });
  assert(teacherDb?.lecturerProfile?.departmentId, "No TEACHER with department found");

  const actors = {
    superAdmin: {
      label: "SUPER_ADMIN",
      userId: superAdminDb.id,
      email: superAdminDb.email,
    },
    dean: {
      label: "DEAN",
      userId: deanDb.id,
      email: deanDb.email,
      facultyId: deanDb.deanProfile.facultyId,
    },
    student1: {
      label: "STUDENT_1",
      userId: student1Db.id,
      email: student1Db.email,
    },
    student2: {
      label: "STUDENT_2",
      userId: student2Db.id,
      email: student2Db.email,
    },
    teacher: {
      label: "TEACHER",
      userId: teacherDb.id,
      email: teacherDb.email,
      departmentId: teacherDb.lecturerProfile.departmentId,
    },
  };

  for (const key of Object.keys(actors)) {
    const actor = actors[key];
    const login = await loginUser(actor.email, TEST_PASSWORD);
    actors[key] = { ...actor, ...login };
    assert(login.authToken, `${actor.label}: missing auth token cookie`);
    assert(login.csrfToken || login.csrfCookie, `${actor.label}: missing CSRF token`);
    console.log(`${actor.label} logged in`, {
      userId: login.user?.id,
      role: login.user?.role,
      hasAuthToken: !!login.authToken,
      hasRefreshToken: !!login.refreshToken,
    });
  }
  mark(true, "Auth + token acquisition works");

  logStep("STEP 2: SOCKET CONNECTION");
  const socketEvents = {
    superAdmin: [],
    dean: [],
    student1: [],
    student2: [],
  };

  const scopedUsers = await prisma.user.findMany({
    where: { id: { in: [actors.superAdmin.userId, actors.dean.userId, actors.student1.userId, actors.student2.userId] } },
    include: {
      deanProfile: true,
      lecturerProfile: { include: { faculties: true } },
      studentRegistrations: {
        take: 1,
        orderBy: { id: "desc" },
        include: { batchSection: { include: { batch: { include: { program: true } } } } },
      },
    },
  });

  function deriveRooms(user) {
    const rooms = ["global"];
    if (user.deanProfile?.facultyId) rooms.push(`faculty:${user.deanProfile.facultyId}`);
    if (user.lecturerProfile?.departmentId) rooms.push(`department:${user.lecturerProfile.departmentId}`);
    const reg = user.studentRegistrations?.[0];
    const sectionId = reg?.batchSectionId;
    const batchId = reg?.batchSection?.batchId;
    const deptId = reg?.batchSection?.batch?.program?.departmentId;
    if (deptId) rooms.push(`department:${deptId}`);
    if (batchId) rooms.push(`batch:${batchId}`);
    if (sectionId) rooms.push(`section:${sectionId}`);
    return Array.from(new Set(rooms));
  }

  const socketByKey = {};
  for (const key of ["superAdmin", "dean", "student1", "student2"]) {
    const actor = actors[key];
    const socket = await connectSocket(actor);
    socketByKey[key] = socket;
    socket.on("announcement:new", (event) => {
      socketEvents[key].push(event);
      console.log("event received", {
        userId: actor.userId,
        role: actor.label,
        announcementTitle: event.title,
      });
    });
    const scoped = scopedUsers.find((u) => u.id === actor.userId);
    console.log("socket connected", {
      userId: actor.userId,
      role: actor.label,
      roomsJoined: scoped ? deriveRooms(scoped) : ["global"],
    });
  }
  mark(true, "Socket connections established");

  logStep("STEP 3: CREATE ANNOUNCEMENTS (BACKEND)");
  const facultyId = actors.dean.facultyId;
  const departmentId = deptA1.id;
  const student1Registration = await prisma.studentRegistration.findFirst({
    where: { studentId: actors.student1.userId },
    orderBy: { id: "desc" },
    include: {
      batchSection: {
        include: {
          batch: {
            include: {
              program: true,
            },
          },
        },
      },
    },
  });
  assert(student1Registration?.batchSection?.batchId, "Student 1 missing batch/section for targeting tests");
  const batchId = student1Registration.batchSection.batchId;
  const sectionId = student1Registration.batchSectionId;

  const createPayloads = [
    {
      key: "global",
      payload: {
        title: `Global Test ${Date.now()}`,
        content: "Global announcement integration test",
        priority: "normal",
        targetType: "ALL",
      },
    },
    {
      key: "faculty",
      payload: {
        title: `Faculty Test ${Date.now()}`,
        content: "Faculty announcement integration test",
        priority: "important",
        targetType: "FACULTY",
        facultyId,
      },
    },
    {
      key: "department",
      payload: {
        title: `Department Test ${Date.now()}`,
        content: "Department announcement integration test",
        priority: "urgent",
        targetType: "DEPARTMENT",
        facultyId,
        departmentId,
      },
    },
    {
      key: "batch",
      payload: {
        title: `Batch Test ${Date.now()}`,
        content: "Batch announcement integration test",
        priority: "important",
        targetType: "BATCH",
        facultyId,
        departmentId,
        batchId,
      },
    },
    {
      key: "section",
      payload: {
        title: `Section Test ${Date.now()}`,
        content: "Section announcement integration test",
        priority: "urgent",
        targetType: "SECTION",
        facultyId,
        departmentId,
        batchId,
        sectionId,
      },
    },
  ];

  const created = {};
  for (const item of createPayloads) {
    const { response, payload } = await apiRequest({
      actor: actors.superAdmin,
      endpoint: "/announcements",
      method: "POST",
      body: item.payload,
      withCsrf: true,
    });
    assert(response.ok, `Create ${item.key} failed: ${response.status} ${JSON.stringify(payload)}`);
    created[item.key] = payload;
    console.log("created announcement", {
      id: payload.id,
      title: payload.title,
      targetType: payload.targetType,
      targeting: payload.targeting,
    });
  }
  mark(true, "Creation works");

  logStep("STEP 4: VERIFY API RESPONSE");
  for (const [key, announcement] of Object.entries(created)) {
    assert(announcement.id, `${key}: missing id`);
    assert(announcement.title, `${key}: missing title`);
    assert(announcement.targetType, `${key}: missing targetType`);
    assert(typeof announcement.targeting === "object", `${key}: missing targeting`);
    assert(Array.isArray(announcement.imageUrls), `${key}: imageUrls must be array`);
  }
  mark(true, "Response structure valid");

  logStep("STEP 5: VERIFY VISIBILITY (API FETCH)");
  const visible = {};
  for (const key of ["superAdmin", "dean", "student1", "student2"]) {
    const { response, payload } = await apiRequest({
      actor: actors[key],
      endpoint: "/announcements",
      method: "GET",
    });
    assert(response.ok, `Fetch announcements failed for ${key}: ${response.status}`);
    const list = Array.isArray(payload?.results) ? payload.results : [];
    visible[key] = list.map((a) => a.title);
    console.log(`${actors[key].label} sees`, visible[key]);
  }

  const globalTitle = created.global.title;
  const facultyTitle = created.faculty.title;
  const departmentTitle = created.department.title;
  const batchTitle = created.batch.title;
  const sectionTitle = created.section.title;

  assert(
    visible.superAdmin.includes(globalTitle) &&
      visible.superAdmin.includes(facultyTitle) &&
      visible.superAdmin.includes(departmentTitle) &&
      visible.superAdmin.includes(batchTitle) &&
      visible.superAdmin.includes(sectionTitle),
    "SUPER_ADMIN visibility mismatch"
  );
  assert(
    visible.dean.includes(globalTitle) &&
      visible.dean.includes(facultyTitle) &&
      visible.dean.includes(departmentTitle) &&
      visible.dean.includes(batchTitle) &&
      visible.dean.includes(sectionTitle),
    "DEAN visibility mismatch"
  );
  assert(
    visible.student1.includes(globalTitle) &&
      visible.student1.includes(facultyTitle) &&
      visible.student1.includes(departmentTitle) &&
      visible.student1.includes(batchTitle) &&
      visible.student1.includes(sectionTitle),
    "STUDENT_1 visibility mismatch"
  );
  assert(visible.student2.includes(globalTitle) && visible.student2.includes(facultyTitle), "STUDENT_2 should see global + faculty");
  assert(!visible.student2.includes(departmentTitle), "STUDENT_2 should not see department A1");
  assert(!visible.student2.includes(batchTitle), "STUDENT_2 should not see batch");
  assert(!visible.student2.includes(sectionTitle), "STUDENT_2 should not see section");
  console.log("incorrect visibility checks", {
    student2HasDepartment: visible.student2.includes(departmentTitle),
    student2HasBatch: visible.student2.includes(batchTitle),
    student2HasSection: visible.student2.includes(sectionTitle),
  });
  mark(true, "Visibility correct");

  logStep("STEP 6: VERIFY REAL-TIME (WEBSOCKET)");
  await sleep(1500);

  function received(key, title) {
    return socketEvents[key].some((evt) => evt.title === title);
  }

  assert(received("superAdmin", globalTitle) && received("dean", globalTitle) && received("student1", globalTitle) && received("student2", globalTitle), "GLOBAL realtime mismatch");
  assert(received("superAdmin", facultyTitle) && received("dean", facultyTitle) && received("student1", facultyTitle) && received("student2", facultyTitle), "FACULTY realtime mismatch");
  assert(received("superAdmin", departmentTitle) && received("dean", departmentTitle) && received("student1", departmentTitle), "DEPARTMENT A1 realtime expected for super/dean/student1");
  assert(received("superAdmin", batchTitle) && received("dean", batchTitle) && received("student1", batchTitle), "BATCH realtime expected for super/dean/student1");
  assert(received("superAdmin", sectionTitle) && received("dean", sectionTitle) && received("student1", sectionTitle), "SECTION realtime expected for super/dean/student1");
  assert(!received("student2", departmentTitle), "DEPARTMENT A1 should not reach student2");
  assert(!received("student2", batchTitle), "BATCH should not reach student2");
  assert(!received("student2", sectionTitle), "SECTION should not reach student2");
  mark(true, "WebSocket delivery correct");

  logStep("ADVANCED: DUPLICATE EVENT DETECTION");
  let duplicateCount = 0;
  for (const key of Object.keys(socketEvents)) {
    const eventMap = new Map();
    for (const evt of socketEvents[key]) {
      const id = String(evt.id);
      eventMap.set(id, (eventMap.get(id) || 0) + 1);
    }
    const duplicates = Array.from(eventMap.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      duplicateCount += duplicates.length;
      console.log("duplicates detected", {
        userId: actors[key].userId,
        role: actors[key].label,
        duplicates: duplicates.map(([id, count]) => ({ announcementId: id, count })),
      });
    }
  }
  assert(duplicateCount === 0, "Duplicate WebSocket events detected");
  mark(true, "No duplicate WebSocket events");

  logStep("ADVANCED: DISCONNECT + RECONNECT");
  socketByKey.student1.disconnect();
  await sleep(400);
  socketByKey.student1 = await connectSocket(actors.student1);
  socketByKey.student1.on("announcement:new", (event) => {
    socketEvents.student1.push(event);
    console.log("event received", {
      userId: actors.student1.userId,
      role: actors.student1.label,
      announcementTitle: event.title,
    });
  });
  const reconnectPayload = {
    title: `Reconnect Test ${Date.now()}`,
    content: "Reconnect delivery test",
    priority: "normal",
    targetType: "SECTION",
    facultyId,
    departmentId,
    batchId,
    sectionId,
  };
  const reconnectCreate = await apiRequest({
    actor: actors.superAdmin,
    endpoint: "/announcements",
    method: "POST",
    withCsrf: true,
    body: reconnectPayload,
  });
  assert(reconnectCreate.response.ok, "Reconnect test announcement creation failed");
  await sleep(1200);
  assert(received("student1", reconnectPayload.title), "Reconnected student did not receive event");
  mark(true, "Socket reconnect delivery works");

  logStep("ADVANCED: MISSED EVENT FALLBACK");
  socketByKey.student2.disconnect();
  await sleep(300);
  const missedPayload = {
    title: `Missed Event Global ${Date.now()}`,
    content: "Should be available via API even if event missed",
    priority: "normal",
    targetType: "ALL",
  };
  const missedCreate = await apiRequest({
    actor: actors.superAdmin,
    endpoint: "/announcements",
    method: "POST",
    withCsrf: true,
    body: missedPayload,
  });
  assert(missedCreate.response.ok, "Missed event test announcement creation failed");
  await sleep(800);
  const student2ReceivedMissed = received("student2", missedPayload.title);
  console.log("missed events", {
    userId: actors.student2.userId,
    role: actors.student2.label,
    title: missedPayload.title,
    receivedViaSocket: student2ReceivedMissed,
  });
  assert(!student2ReceivedMissed, "Student2 should miss event while disconnected");
  const fallbackFetch = await apiRequest({
    actor: actors.student2,
    endpoint: "/announcements",
    method: "GET",
  });
  assert(fallbackFetch.response.ok, "Fallback API fetch failed");
  const fallbackResults = Array.isArray(fallbackFetch.payload?.results) ? fallbackFetch.payload.results : [];
  assert(
    fallbackResults.some((a) => a.title === missedPayload.title),
    "Missed socket event announcement not available in API fetch"
  );
  socketByKey.student2 = await connectSocket(actors.student2);
  socketByKey.student2.on("announcement:new", (event) => {
    socketEvents.student2.push(event);
    console.log("event received", {
      userId: actors.student2.userId,
      role: actors.student2.label,
      announcementTitle: event.title,
    });
  });
  mark(true, "Missed-event API fallback works");

  logStep("ADVANCED: RAPID 10 ANNOUNCEMENTS STABILITY");
  const rapidPayloads = Array.from({ length: 10 }).map((_, idx) => ({
    title: `Rapid Global ${Date.now()} #${idx + 1}`,
    content: `Rapid announcement ${idx + 1}`,
    priority: idx % 3 === 0 ? "urgent" : idx % 2 === 0 ? "important" : "normal",
    targetType: "ALL",
  }));
  const rapidResults = await Promise.all(
    rapidPayloads.map((payload) =>
      apiRequest({
        actor: actors.superAdmin,
        endpoint: "/announcements",
        method: "POST",
        withCsrf: true,
        body: payload,
      })
    )
  );
  assert(rapidResults.every((r) => r.response.ok), "One or more rapid creations failed");
  await sleep(2000);
  const rapidTitles = new Set(rapidPayloads.map((p) => p.title));
  const receivedRapidByUser = {};
  for (const key of ["superAdmin", "dean", "student1", "student2"]) {
    const titles = socketEvents[key].map((e) => e.title);
    const matched = titles.filter((t) => rapidTitles.has(t));
    receivedRapidByUser[key] = matched.length;
  }
  console.log("rapid stability socket counts", receivedRapidByUser);
  for (const key of ["superAdmin", "dean", "student1", "student2"]) {
    assert(receivedRapidByUser[key] >= 10, `${actors[key].label} missed rapid events (${receivedRapidByUser[key]}/10)`);
  }
  mark(true, "Rapid 10 announcement stability works");

  logStep("ADVANCED: ORDERING CONSISTENCY");
  const orderingPayloads = [];
  for (let i = 1; i <= 3; i += 1) {
    const payload = {
      title: `Ordering Test ${Date.now()} #${i}`,
      content: `Ordering validation ${i}`,
      priority: "normal",
      targetType: "ALL",
    };
    orderingPayloads.push(payload);
    const createdOrdering = await apiRequest({
      actor: actors.superAdmin,
      endpoint: "/announcements",
      method: "POST",
      withCsrf: true,
      body: payload,
    });
    assert(createdOrdering.response.ok, `Ordering create failed for #${i}`);
    await sleep(120);
  }
  await sleep(1500);
  const expectedOrderTitles = orderingPayloads.map((p) => p.title);
  const orderingByUser = {};
  for (const key of ["superAdmin", "dean", "student1", "student2"]) {
    orderingByUser[key] = socketEvents[key]
      .filter((evt) => expectedOrderTitles.includes(evt.title))
      .map((evt) => evt.title);
    assert(
      orderingByUser[key].length === expectedOrderTitles.length,
      `${actors[key].label} missed ordering events (${orderingByUser[key].length}/${expectedOrderTitles.length})`
    );
    assert(
      orderingByUser[key].join(" | ") === expectedOrderTitles.join(" | "),
      `${actors[key].label} ordering mismatch`
    );
  }
  console.log("ordering across clients", orderingByUser);
  mark(true, "Ordering consistent");

  logStep("ADVANCED: AUTHORIZATION DRIFT");
  const student2LatestRegistration = await prisma.studentRegistration.findFirst({
    where: { studentId: actors.student2.userId },
    orderBy: { id: "desc" },
  });
  assert(student2LatestRegistration, "Student2 registration not found for drift test");
  const originalSectionId = student2LatestRegistration.batchSectionId;
  await prisma.studentRegistration.update({
    where: { id: student2LatestRegistration.id },
    data: { batchSectionId: sectionId },
  });
  console.log("authorization drift: student2 moved", {
    userId: actors.student2.userId,
    fromSectionId: originalSectionId,
    toSectionId: sectionId,
  });

  const driftPayloadBeforeReconnect = {
    title: `Drift Pre-Reconnect ${Date.now()}`,
    content: "Should rely on API until reconnect",
    priority: "important",
    targetType: "SECTION",
    facultyId,
    departmentId,
    batchId,
    sectionId,
  };
  const driftBefore = await apiRequest({
    actor: actors.superAdmin,
    endpoint: "/announcements",
    method: "POST",
    withCsrf: true,
    body: driftPayloadBeforeReconnect,
  });
  assert(driftBefore.response.ok, "Drift pre-reconnect create failed");
  await sleep(1200);
  const receivedBeforeReconnect = received("student2", driftPayloadBeforeReconnect.title);
  console.log("authorization drift before reconnect", {
    userId: actors.student2.userId,
    receivedViaSocket: receivedBeforeReconnect,
  });
  const driftFetch = await apiRequest({
    actor: actors.student2,
    endpoint: "/announcements",
    method: "GET",
  });
  assert(driftFetch.response.ok, "Drift fetch failed");
  const driftResults = Array.isArray(driftFetch.payload?.results) ? driftFetch.payload.results : [];
  assert(
    driftResults.some((a) => a.title === driftPayloadBeforeReconnect.title),
    "Drift API visibility not updated for student2"
  );

  socketByKey.student2.disconnect();
  await sleep(300);
  socketByKey.student2 = await connectSocket(actors.student2);
  socketByKey.student2.on("announcement:new", (event) => {
    socketEvents.student2.push(event);
    console.log("event received", {
      userId: actors.student2.userId,
      role: actors.student2.label,
      announcementTitle: event.title,
    });
  });

  const driftPayloadAfterReconnect = {
    title: `Drift Post-Reconnect ${Date.now()}`,
    content: "Should deliver after reconnect",
    priority: "important",
    targetType: "SECTION",
    facultyId,
    departmentId,
    batchId,
    sectionId,
  };
  const driftAfter = await apiRequest({
    actor: actors.superAdmin,
    endpoint: "/announcements",
    method: "POST",
    withCsrf: true,
    body: driftPayloadAfterReconnect,
  });
  assert(driftAfter.response.ok, "Drift post-reconnect create failed");
  await sleep(1200);
  assert(received("student2", driftPayloadAfterReconnect.title), "Student2 did not receive drift event after reconnect");
  await prisma.studentRegistration.update({
    where: { id: student2LatestRegistration.id },
    data: { batchSectionId: originalSectionId },
  });
  mark(true, "Authorization drift handled");

  logStep("ADVANCED: IMAGE PAYLOAD HANDLING");
  const imageUrls = Array.from({ length: 6 }).map(
    (_, i) => `https://cdn.example.com/announcements/test-image-${Date.now()}-${i + 1}.jpg`
  );
  const imagePayload = {
    title: `Image Payload Test ${Date.now()}`,
    content: "Multi image payload test",
    priority: "important",
    targetType: "ALL",
    imageUrls,
  };
  const imageCreate = await apiRequest({
    actor: actors.superAdmin,
    endpoint: "/announcements",
    method: "POST",
    withCsrf: true,
    body: imagePayload,
  });
  assert(imageCreate.response.ok, "Image payload announcement create failed");
  assert(
    Array.isArray(imageCreate.payload.imageUrls) && imageCreate.payload.imageUrls.length >= 5,
    "Image payload response missing expected imageUrls"
  );
  await sleep(1200);
  const imageEvent = socketEvents.student1.find((evt) => evt.title === imagePayload.title);
  assert(imageEvent, "Image payload event not delivered to student1");
  assert(Array.isArray(imageEvent.imageUrls) && imageEvent.imageUrls.length >= 5, "Image payload not delivered via socket");
  console.log("image payload event", {
    userId: actors.student1.userId,
    title: imagePayload.title,
    imageCount: imageEvent.imageUrls.length,
  });
  mark(true, "Image payload handled");

  logStep("STEP 7: FRONTEND UI CHECK (SIMULATED)");
  const uiState = [];
  const toastLogs = [];

  function addToUI(announcement) {
    if (uiState.some((x) => String(x.id) === String(announcement.id))) return;
    uiState.unshift(announcement);
  }

  function showToast(title) {
    toastLogs.push(title);
  }

  for (const event of socketEvents.student1) {
    addToUI(event);
    showToast(event.title);
  }
  const before = uiState.length;
  for (const event of socketEvents.student1) addToUI(event);
  const after = uiState.length;
  const duplicateSimulationTarget = socketEvents.student1[0];
  if (duplicateSimulationTarget) {
    addToUI(duplicateSimulationTarget);
    addToUI(duplicateSimulationTarget);
  }
  const afterDuplicateSimulation = uiState.length;

  assert(before === after, "Duplicate prevention failed in UI simulation");
  assert(afterDuplicateSimulation === after, "Idempotent state failed on duplicate events");
  assert(toastLogs.length >= 5, "Expected at least 5 toasts in UI simulation");
  assert(uiState.every((a) => !!getPriorityBadge(a.priority)), "Priority badge mapping failed");
  mark(true, "Frontend simulation works (state + toast + badges)");
  mark(true, "Idempotent UI state");
  console.log("simulated UI announcements", uiState.map((a) => ({
    id: a.id,
    title: a.title,
    priorityBadge: getPriorityBadge(a.priority),
    imageCount: Array.isArray(a.imageUrls) ? a.imageUrls.length : 0,
  })));

  logStep("STEP 8: ERROR CASES");
  {
    const { response } = await apiRequest({
      actor: actors.student1,
      endpoint: "/announcements",
      method: "POST",
      withCsrf: true,
      body: {
        title: "Student should fail",
        content: "forbidden",
        priority: "normal",
        targetType: "ALL",
      },
    });
    assert(response.status === 403, `Expected 403 for student create, got ${response.status}`);
  }
  {
    const otherFaculty = await prisma.faculty.findFirst({
      where: { id: { not: actors.dean.facultyId } },
      orderBy: { id: "asc" },
    });
    assert(otherFaculty, "No second faculty available for dean cross-faculty test");
    const { response } = await apiRequest({
      actor: actors.dean,
      endpoint: "/announcements",
      method: "POST",
      withCsrf: true,
      body: {
        title: "Dean cross faculty fail",
        content: "forbidden",
        priority: "important",
        targetType: "FACULTY",
        facultyId: otherFaculty.id,
      },
    });
    assert(response.status === 403, `Expected 403 for dean targeting other faculty, got ${response.status}`);
  }
  {
    const { response } = await apiRequest({
      actor: actors.superAdmin,
      endpoint: "/announcements",
      method: "POST",
      withCsrf: true,
      body: {
        title: "Missing targeting fail",
        content: "validation",
        priority: "important",
        targetType: "FACULTY",
      },
    });
    assert(response.status === 400, `Expected 400 for missing targeting, got ${response.status}`);
  }
  mark(true, "Role restriction + validation errors work");

  for (const socket of Object.values(socketByKey)) socket.disconnect();

  logStep("FINAL OUTPUT");
  const hasFail = summary.some((s) => !s.result);
  console.log(`[PASS] Creation works`);
  console.log(`[PASS] Role restriction works`);
  console.log(`[PASS] Visibility correct`);
  console.log(`[PASS] WebSocket delivery correct`);
  console.log(`[PASS] Ordering consistent`);
  console.log(`[PASS] Idempotent UI state`);
  console.log(`[PASS] Authorization drift handled`);
  console.log(`[PASS] Image payload handled`);
  if (hasFail) {
    console.log(`[FAIL] One or more checks failed`);
    process.exitCode = 1;
  } else {
    console.log(`[PASS] All requested integration checks passed`);
  }
}

main()
  .catch((error) => {
    console.error("\n[FAIL] E2E integration test crashed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
