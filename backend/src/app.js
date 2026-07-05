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
import { getCorsAllowlist } from "./config/env.js";

import authRouter from "./controllers/auth/auth.js";
import usersRouter from "./controllers/auth/users.js";

import facultiesRouter from "./controllers/academic/faculties.js";
import departmentsRouter from "./controllers/academic/departments.js";
import programsRouter from "./controllers/academic/programs.js";
import academicYearRouter from "./controllers/academic/academicYear.js";
import batchesRouter from "./controllers/academic/batches.js";
import batchSectionsRouter from "./controllers/academic/batchSections.js";
import coursesRouter from "./controllers/academic/courses.js";

import deanRouter from "./controllers/dean/dean.js";
import adminRouter from "./controllers/admin/admin.js";

import studentPortalRouter from "./controllers/portals/studentPortal.js";
import lecturerPortalRouter from "./controllers/portals/lecturerPortal.js";

import chatRouter from "./controllers/courses/chat.js";
import groupsRouter from "./controllers/courses/groups.js";
import rosterRouter from "./controllers/courses/roster.js";
import quizzesRouter from "./controllers/courses/quizzes.js";
import resourcesRouter from "./controllers/courses/resources.js";
import courseOfferingsRouter from "./controllers/courses/course-offerings.js";
import quizTakingRouter from "./controllers/courses/quiz-taking.js";
import questionBankRouter from "./controllers/courses/question-bank.js";
import courseFeedRouter from "./controllers/courses/course-feed.js";
import courseAccessRouter from "./controllers/courses/course-access.js";
import gradebookRouter from "./controllers/courses/gradebook.js";

import announcementsRouter from "./features/announcements/routes.announcements.js";
import pushRouter from "./features/announcements/routes.push.js";
import {
  announcementLinkRedirectLimiter,
  announcementLinkRedirectHandler,
} from "./features/announcements/handlers/announcementLinkRedirect.handler.js";
import debugRouter from "./controllers/debug/announcement-test-users.js";
import discussionsRouter from "./controllers/discussions/discussions.js";
import clubsRouter from "./controllers/clubs/clubs.js";
import calendarRouter from "./controllers/calendar/calendar.js";
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
  // Raster images are safe to render inline (no script execution); serve them
  // inline so <img>, CSS backgrounds, direct links and Next's image optimizer
  // all work. Everything else (notably .svg / .html / .pdf) keeps `attachment`
  // as the defence-in-depth against stored-XSS via a masquerading upload.
  const inlineSafe = /\.(png|jpe?g|webp|gif)$/i.test(req.path);
  res.setHeader("Content-Disposition", inlineSafe ? "inline" : "attachment");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Helmet's default CORP is `same-origin`, which blocks the frontend origin
  // (a different port) from embedding these images as <img>/CSS backgrounds.
  // Relax it to `cross-origin` for uploads only so course covers/avatars load.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static("uploads"));

// CORS — allowlist driven by env so prod can lock down to the production
// frontend origin. Comma-separated `CORS_ORIGINS` overrides; falls back to
// `FRONTEND_URL` (used by the socket layer too) or to localhost defaults
// for dev. Credentialed requests require an exact origin match — wildcards
// would let a malicious site read authenticated responses.
const corsAllowlist = getCorsAllowlist();

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

// ═══════════════════════════════════════════════════════════════════════════════════
// CATEGORY 2: Academic Structure
// ═══════════════════════════════════════════════════════════════════════════
app.use("/api/faculties", facultiesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/programs", programsRouter);
app.use("/api/academic-years", academicYearRouter);
app.use("/api/batches", batchesRouter);
app.use("/api/batch-sections", batchSectionsRouter);
app.use("/api/courses", coursesRouter);

// ══════════════════════════════════════════════════════════════════════════════��════
// CATEGORY 3: Dean Functions (all-in-one for faculty management)
// ═══════════════════════════════════════════════════════════════════════════════════
app.use("/api/dean", deanRouter);
app.use("/api/admin", adminRouter);

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
app.use("/api/course-offerings", courseOfferingsRouter);
app.use("/api/course-feed", courseFeedRouter);
app.use("/api/course-access", courseAccessRouter);
app.use("/api/gradebook", gradebookRouter);

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY 6: General Commms
// ═══════════════════════════════════════════════════════════════════════════
app.use("/api/announcements", announcementsRouter);
app.use("/api/push", pushRouter);
app.use("/api/calendar", calendarRouter);
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