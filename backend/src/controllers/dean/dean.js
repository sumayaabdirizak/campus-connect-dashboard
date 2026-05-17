import { Router } from 'express';
import { auth } from "../../middleware/auth.js";
import { requireDean } from "../../middleware/requireDean.js";
import {
  getFacultyUsers, getFacultyUserById, updateFacultyUser, removeFacultyUser,
  getPendingRegistrations, approveRegistration, rejectRegistration,
  assignStudentToSection, getStudentRegistrations
} from './userManagement.controller.js';
import {
  getFacultyBatches, getFacultyBatchById, createFacultyBatch, updateFacultyBatch,
  deleteFacultyBatch, getBatchSections, getSectionById, createBatchSection,
  updateBatchSection, deleteBatchSection
} from './batchManagement.controller.js';
import {
  getFacultyTeachers, getFacultyTeacherById
} from './teacherAssigning.controller.js';
import {
  getFacultyCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  assignTeacherToCourse, removeTeacherFromCourse,
  getCourseOfferings, createCourseOffering, deleteCourseOffering
} from './courseManagement.controller.js';

const router = Router();
router.use(auth, requireDean);

// ── User Management ──────────────────────────────────────
router.get('/users', getFacultyUsers);
router.get('/users/:id', getFacultyUserById);
router.put('/users/:id', updateFacultyUser);
router.delete('/users/:id', removeFacultyUser);
router.get('/users/:id/registrations', getStudentRegistrations);
router.post('/users/:id/assign-section', assignStudentToSection);

// ── Registrations ────────────────────────────────────────
router.get('/registrations/pending', getPendingRegistrations);
router.put('/registrations/:id/approve', approveRegistration);
router.put('/registrations/:id/reject', rejectRegistration);

// ── Batch Management ─────────────────────────────────────
router.get('/batches', getFacultyBatches);
router.get('/batches/:id', getFacultyBatchById);
router.post('/batches', createFacultyBatch);
router.put('/batches/:id', updateFacultyBatch);
router.delete('/batches/:id', deleteFacultyBatch);

// ── Section Management ───────────────────────────────────
router.get('/batches/:id/sections', getBatchSections);
router.post('/batches/:id/sections', createBatchSection);
router.get('/sections/:id', getSectionById);
router.put('/sections/:id', updateBatchSection);
router.delete('/sections/:id', deleteBatchSection);

// ── Teachers (read-only — assignment is via courses now) ─
router.get('/teachers', getFacultyTeachers);
router.get('/teachers/:id', getFacultyTeacherById);

// ── Courses ──────────────────────────────────────────────
router.get('/courses', getFacultyCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// ── Teacher ↔ Course Assignments ─────────────────────────
router.post('/courses/:id/teachers', assignTeacherToCourse);
router.delete('/courses/:id/teachers/:teacherId', removeTeacherFromCourse);

// ── Course Offerings (Course → Section + Semester) ───────
router.get('/offerings', getCourseOfferings);
router.post('/offerings', createCourseOffering);
router.delete('/offerings/:id', deleteCourseOffering);

export default router;
