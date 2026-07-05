import { Router } from 'express';
import { requireDean } from "../../middleware/requireDean.js";
import {
  getFacultyUsers, getFacultyUserById
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
  getCourseOfferings
} from './courseManagement.controller.js';
import { getDeanAnalytics } from './deanAnalytics.controller.js';
import { getDeanReports } from './deanReports.controller.js';

const router = Router();
router.use(requireDean);

// ── Users (read-only) ────────────────────────────────────
router.get('/users', getFacultyUsers);
router.get('/users/:id', getFacultyUserById);

// ── Batches (read-only) ──────────────────────────────────
router.get('/batches', getFacultyBatches);
router.get('/batches/:id', getFacultyBatchById);

// ── Sections (read-only) ─────────────────────────────────
router.get('/batches/:id/sections', getBatchSections);
router.get('/sections/:id', getSectionById);

// ── Teachers (read-only) ─────────────────────────────────
router.get('/teachers', getFacultyTeachers);
router.get('/teachers/:id', getFacultyTeacherById);

// ── Courses (read-only) ──────────────────────────────────
router.get('/courses', getFacultyCourses);
router.get('/courses/:id', getCourseById);

// ── Offerings (read-only) ────────────────────────────────
router.get('/offerings', getCourseOfferings);

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics', getDeanAnalytics);
router.get('/reports', getDeanReports);

export default router;
