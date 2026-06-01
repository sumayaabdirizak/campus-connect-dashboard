import express from "express";
import cors from "cors";
import helmet from "helmet";
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
import courseFeedRouter from "./controllers/courseDetails/course-feed.js";
import courseAccessRouter from "./controllers/courseDetails/course-access.js";

import announcementsRouter from "./controllers/announcements/announcements.js";
import pushRouter from "./features/announcements/routes.push.js";
import {
  announcementLinkRedirectLimiter,
  announcementLinkRedirectHandler,
} from "./features/announcements/handlers/announcementLinkRedirect.handler.js";
import debugRouter from "./controllers/debug/announcement-test-users.js";
import discussionsRouter from "./controllers/discussions/discussions.js";
import clubsRouter from "./controllers/clubs/clubs.js";
import rateLimit from "express-rate-limit";

// ─── Security headers (Helmet) ──────────────────────────────────────────────
// `helmet()` ships sensible defaults: X-Content-Type-Options nosniff,
// Referrer-Policy strict-origin-when-cross-origin, X-Frame-Options DENY,
// X-DNS-Prefetch-Control off, X-Permitted-Cross-Domain-Policies none,
// Cross-Origin-Resource-Policy same-origin, plus HSTS in production.
//
// CSP is OFF by default because this app's frontend lives on a different
// origin and uploads itself runs through tight allowlists already — turning
// CSP on without a per-route audit would break inline styles in shadcn.
// If you want CSP, do it in a follow-up with a CSP report-only deployment
// for a week first to find every inline-style violation in shadcn theming.
//
// We DO keep COEP off because our static `/uploads` route serves images
// that other frontend origins fetch — strict COEP would break them.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json());
app.use(requestLogger());

// `/uploads` files are forced to download (not inline-render) — defence-in-
// depth against a stored XSS where someone uploads `.html` masquerading as
// an image. The MIME / extension allowlist on the upload endpoint is the
// primary defence; this is the second layer.
app.use("/uploads", (req, res, next) => {
  res.setHeader("Content-Disposition", "attachment");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}, express.static("uploads"));

// CORS — allowlist driven by env so prod can lock down to the production
// frontend origin. Comma-separated `CORS_ORIGINS` overrides; falls back to
// `FRONTEND_URL` (used by the socket layer too) or to localhost defaults
// for dev. Credentialed requests require an exact origin match — wildcards
// would let a malicious site read authenticated responses.
const corsAllowlist = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin requests (server-side fetch, curl) have no Origin header
    // and should be allowed through.
    if (!origin) return callback(null, true);
    if (corsAllowlist.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Public CTR redirect (no auth). Must stay before `/api` auth gate.
app.get("/api/r/:announcementId/:token", announcementLinkRedirectLimiter, announcementLinkRedirectHandler);

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
app.use("/api/course-feed", courseFeedRouter);
app.use("/api/course-access", courseAccessRouter);

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 6: General Commms
// ═══════════════════════════════════════════════════════════════════════════
app.use("/api/announcements", announcementsRouter);
app.use("/api/push", pushRouter);
const discussionsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.DISCUSSIONS_RATE_LIMIT_PER_MIN ?? 180),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", code: "DISCUSSIONS_RATE_LIMIT" },
});
app.use("/api/discussions", discussionsRateLimit, discussionsRouter);

// ═══════════════════════════════════════════════════════════════════════════════════
// CATEGORY 7: Clubs
// ═══════════════════════════════════════════════════════════════════════════════════
app.use("/api/clubs", clubsRouter);

// Debug helpers — never expose in production.
if (process.env.NODE_ENV !== "production") {
  app.use("/api/debug", debugRouter);
}

app.use(notFound);
app.use(errorHandler);

export { app };