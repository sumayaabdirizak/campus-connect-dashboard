import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getUniversityAisStatus,
  getUniversityAisDeanOverview,
  previewUniversityAisStudents,
  syncUniversityAisStudents,
  syncFacultyUniversityAisStudents,
  syncUniversityAisCourses,
  syncFacultyUniversityAisCourses,
  syncUniversityAisDean,
  previewUniversityAisLecturers,
  syncFacultyUniversityAisLecturers,
  getUniversityAisActiveTerm,
  syncUniversityAisAcademicTerms,
} from '../../controllers/admin/universityAis.controller.js';

const router = Router();

router.get('/status', requireRole('SUPER_ADMIN'), asyncHandler(getUniversityAisStatus));
router.get(
  '/dean-overview',
  requireRole('SUPER_ADMIN'),
  asyncHandler(getUniversityAisDeanOverview)
);
router.get(
  '/students-preview',
  requireRole('SUPER_ADMIN'),
  asyncHandler(previewUniversityAisStudents)
);
router.post(
  '/sync-students',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncUniversityAisStudents)
);
router.post(
  '/sync-faculty-students',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncFacultyUniversityAisStudents)
);
router.post(
  '/sync-courses',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncUniversityAisCourses)
);
router.post(
  '/sync-faculty-courses',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncFacultyUniversityAisCourses)
);
router.get(
  '/lecturers-preview',
  requireRole('SUPER_ADMIN'),
  asyncHandler(previewUniversityAisLecturers)
);
router.post(
  '/sync-faculty-lecturers',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncFacultyUniversityAisLecturers)
);
router.get(
  '/active-term',
  requireRole('SUPER_ADMIN'),
  asyncHandler(getUniversityAisActiveTerm)
);
router.post(
  '/sync-academic-terms',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncUniversityAisAcademicTerms)
);
router.post(
  '/sync-dean',
  requireRole('SUPER_ADMIN'),
  asyncHandler(syncUniversityAisDean)
);

export default router;
