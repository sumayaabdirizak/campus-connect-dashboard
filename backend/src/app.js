import express from "express";
import cors from "cors";
import { prisma } from "./db/prisma.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
import { auth } from "./middleware/auth.js";
import { csrfProtection } from "./middleware/csrf.js";

import authRouter from "./controllers/auth/auth.js";
import usersRouter from "./controllers/auth/users.js";
import { studentProfilesRouter } from "./controllers/auth/studentProfiles.js";
import { lecturerProfilesRouter } from "./controllers/auth/lecturerProfiles.js";
import facultyAdminProfilesRouter from "./controllers/auth/facultyAdminProfiles.js";

import facultiesRouter from "./controllers/academic/faculties.js";
import departmentsRouter from "./controllers/academic/department.js";
import programsRouter from "./controllers/academic/programs.js";
import academicYearRouter from "./controllers/academic/academicYear.js";
import batchesRouter from "./controllers/academic/batches.js";
import batchSectionsRouter from "./controllers/academic/batchSections.js";
import { enrollmentsRouter } from "./controllers/academic/enrollments.js";

import deanRouter from "./controllers/dean/dean.js";

import studentPortalRouter from "./controllers/portals/studentPortal.js";
import lecturerPortalRouter from "./controllers/portals/lecturerPortal.js";

import chatRouter from "./controllers/courseDetails/chat.js";
import groupsRouter from "./controllers/courseDetails/groups.js";
import rosterRouter from "./controllers/courseDetails/roster.js";
import quizzesRouter from "./controllers/courseDetails/quizzes.js";
import resourcesRouter from "./controllers/courseDetails/resources.js";
import attendanceRouter from "./controllers/courseDetails/attendance.js";
import courseOfferingsRouter from "./controllers/courseDetails/course-offerings.js";
import quizTakingRouter from "./controllers/courseDetails/quiz-taking.js";
import questionBankRouter from "./controllers/courseDetails/question-bank.js";

import announcementsRouter from "./controllers/announcements/announcements.js";
import debugRouter from "./controllers/debug/announcement-test-users.js";

app.use(express.json());
app.use(requestLogger());
app.use("/uploads", express.static("uploads"));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

// Global API auth gate with explicit public auth exceptions.
app.use("/api", (req, res, next) => {
  const isPublicAuthRoute =
    (req.method === "POST" &&
      (req.path === "/auth/login" || req.path === "/auth/refresh")) ||
    (req.method === "GET" && req.path === "/auth/csrf");
  if (isPublicAuthRoute) return next();
  return auth(req, res, next);
});
app.use("/api", csrfProtection);

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 1: Auth & Users
// ═══════════════════════════════════════════════════════════════════════════════════
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/student-profiles", studentProfilesRouter);
app.use("/api/lecturer-profiles", lecturerProfilesRouter);
app.use("/api/faculty-admin-profiles", facultyAdminProfilesRouter);

// ═══════════════════════════════════════════════════════════════════════════════════
// CATEGORY 2: Academic Structure
// ═══════════════════════════════════════════════════════════════════════════
app.use("/api/faculties", facultiesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/programs", programsRouter);
app.use("/api/academic-years", academicYearRouter);
app.use("/api/batches", batchesRouter);
app.use("/api/batch-sections", batchSectionsRouter);
app.use("/api/enrollments", enrollmentsRouter);

// ══════════════════════════════════════════════════════════════════════════════��════
// CATEGORY 3: Dean Functions (all-in-one for faculty management)
// ═══════════════════════════════════════════════════════════════════════════════════
app.use("/api/dean", deanRouter);

// ═══════════════════════════════════════════════════════════════════════════════════
// CATEGORY 4: Portal (Student & Lecturer views)
// ═══════════════════════════════════════════════════════════════════════════════════
app.use("/api/student-portal", studentPortalRouter);
app.use("/api/lecturer-portal", lecturerPortalRouter);

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 5: Course Details (per course offering)
// ═══════════════════════════════════════════════════════════════════════════
app.use("/api/chat", chatRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/roster", rosterRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/quiz-taking", quizTakingRouter);
app.use("/api/question-bank", questionBankRouter);
app.use("/api/resources", resourcesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/course-offerings", courseOfferingsRouter);

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 6: General Commms
// ═══════════════════════════════════════════════════════════════════════════
app.use("/api/announcements", announcementsRouter);
app.use("/api/debug", debugRouter);

app.use(notFound);
app.use(errorHandler);

export { app };