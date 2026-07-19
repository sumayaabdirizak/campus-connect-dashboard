/**
 * Mounts all API route groups onto the Express application.
 * Called once from app.js after middleware is configured.
 *
 * @param {import('express').Application} app
 */

import authRouter from './controllers/auth/auth.js';
import usersRouter from './controllers/auth/users.js';
import facultiesRouter from './controllers/academic/faculties.js';
import departmentsRouter from './controllers/academic/departments.js';
import programsRouter from './controllers/academic/programs.js';
import academicYearRouter from './controllers/academic/academicYear.js';
import batchesRouter from './controllers/academic/batches.js';
import batchSectionsRouter from './controllers/academic/batchSections.js';
import coursesRouter from './controllers/academic/courses.js';
import deanRouter from './controllers/dean/dean.js';
import adminRouter from './controllers/admin/admin.js';
import studentPortalRouter from './controllers/portals/studentPortal.js';
import lecturerPortalRouter from './controllers/portals/lecturerPortal.js';
import chatRouter from './controllers/courses/chat.js';
import groupsRouter from './controllers/courses/groups.js';
import rosterRouter from './controllers/courses/roster.js';
import quizzesRouter from './controllers/courses/quizzes.js';
import resourcesRouter from './controllers/courses/resources.js';
import courseOfferingsRouter from './controllers/courses/course-offerings.js';
import quizTakingRouter from './controllers/courses/quiz-taking.js';
import questionBankRouter from './controllers/courses/question-bank.js';
import courseFeedRouter from './controllers/courses/course-feed.js';
import courseAccessRouter from './controllers/courses/course-access.js';
import gradebookRouter from './controllers/courses/gradebook.js';
import announcementsRouter from './features/announcements/routes.announcements.js';
import pushRouter from './features/announcements/routes.push.js';
import debugRouter from './controllers/debug/announcement-test-users.js';
import discussionsRouter from './controllers/discussions/discussions.js';
import clubsRouter from './controllers/clubs/clubs.js';
import officesRouter from './controllers/offices/offices.js';
import inboxRouter from './controllers/inbox/inbox.js';
import calendarRouter from './controllers/calendar/calendar.js';
import rateLimit from 'express-rate-limit';

const discussionsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.DISCUSSIONS_RATE_LIMIT_PER_MIN ?? 180),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'DISCUSSIONS_RATE_LIMIT' },
});

export function mountRoutes(app) {
  // Category 1: Auth & Users
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  // Category 2: Academic Structure
  app.use('/api/faculties', facultiesRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/programs', programsRouter);
  app.use('/api/academic-years', academicYearRouter);
  app.use('/api/batches', batchesRouter);
  app.use('/api/batch-sections', batchSectionsRouter);
  app.use('/api/courses', coursesRouter);

  // Category 3: Dean / Admin Functions
  app.use('/api/dean', deanRouter);
  app.use('/api/admin', adminRouter);

  // Category 4: Portal views (student & lecturer)
  app.use('/api/student-portal', studentPortalRouter);
  app.use('/api/lecturer-portal', lecturerPortalRouter);

  // Category 5: Course details (per offering)
  app.use('/api/chat', chatRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/roster', rosterRouter);
  app.use('/api/quizzes', quizzesRouter);
  app.use('/api/quiz-taking', quizTakingRouter);
  app.use('/api/question-bank', questionBankRouter);
  app.use('/api/resources', resourcesRouter);
  app.use('/api/course-offerings', courseOfferingsRouter);
  app.use('/api/course-feed', courseFeedRouter);
  app.use('/api/course-access', courseAccessRouter);
  app.use('/api/gradebook', gradebookRouter);

  // Category 6: Comms (announcements, calendar, discussions)
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/discussions', discussionsRateLimit, discussionsRouter);

  // Category 7: Clubs, offices, inbox
  app.use('/api/clubs', clubsRouter);
  app.use('/api/offices', officesRouter);
  app.use('/api/inbox', inboxRouter);

  // Debug helpers — never expose in production.
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/debug', debugRouter);
  }
}
