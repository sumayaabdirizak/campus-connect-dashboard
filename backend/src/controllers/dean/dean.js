import { Router } from 'express';
import { requireDean } from "../../middleware/requireDean.js";
import {
  getFacultyUsers, getFacultyUserById,
  assignStudentToSection, getStudentRegistrations
} from './userManagement.controller.js';
import {
  getFacultyBatches, getFacultyBatchById,
  getBatchSections, getSectionById
} from './batchManagement.controller.js';
import {
  getFacultyTeachers, getFacultyTeacherById
} from './teacherAssigning.controller.js';
import {
  getFacultyCourses, getCourseById,
  getCourseOfferings,
  createCourseOffering,
  deleteCourseOffering,
  generateCourseOfferings,
  assignTeacherToCourse,
  removeTeacherFromCourse,
} from './courseManagement.controller.js';
import { getDeanAnalytics } from './deanAnalytics.controller/index.js';
import { getDeanReports } from './deanReports.controller.js';
import {
  getDeanUserLogins,
  getDeanTeacherActivity,
  getDeanUpcomingDeadlines,
} from './deanOversight.controller.js';

const router = Router();
router.use(requireDean);

// ── Users ────────────────────────────────────────────────
router.get('/users', getFacultyUsers);
router.get('/users/:id', getFacultyUserById);
router.get('/users/:id/registrations', getStudentRegistrations);
router.post('/users/:id/assign-section', assignStudentToSection);

// ── Batches (read-only) ──────────────────────────────────
router.get('/batches', getFacultyBatches);
router.get('/batches/:id', getFacultyBatchById);

// ── Sections (read-only) ─────────────────────────────────
router.get('/batches/:id/sections', getBatchSections);
router.get('/sections/:id', getSectionById);

// ── Teachers (read-only) ─────────────────────────────────
router.get('/teachers', getFacultyTeachers);
router.get('/teachers/:id', getFacultyTeacherById);

// ── Courses ──────────────────────────────────────────────
router.get('/courses', getFacultyCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses/:id/teachers', assignTeacherToCourse);
router.delete('/courses/:id/teachers/:teacherId', removeTeacherFromCourse);

// ── Offerings ────────────────────────────────────────────
router.post('/offerings/generate', generateCourseOfferings);
router.get('/offerings', getCourseOfferings);
router.post('/offerings', createCourseOffering);
router.delete('/offerings/:id', deleteCourseOffering);

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics', getDeanAnalytics);
router.get('/reports', getDeanReports);
router.get('/reports/user-logins', getDeanUserLogins);
router.get('/reports/teacher-activity', getDeanTeacherActivity);
router.get('/reports/upcoming-deadlines', getDeanUpcomingDeadlines);

export default router;
