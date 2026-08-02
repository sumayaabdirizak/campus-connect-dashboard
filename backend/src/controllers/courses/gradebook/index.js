import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  requireCourseOfferingManage,
  requireCourseOfferingRead,
} from '../../../middleware/courseOfferingRbac.js';
import { getStudentGrades } from './student.js';
import { getTeacherGradebook } from './teacher.js';
import { getTeacherCourseReport } from './teacherReport.js';
import { getStudentCourseReport } from './studentReport.js';

const router = Router();

// Student: view own grades for a course offering
router.get('/:courseOfferingId/me', requireCourseOfferingRead(), asyncHandler(getStudentGrades));

// Teacher/Dean: full class gradebook
router.get('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(getTeacherGradebook));

// Student: personal performance report for a course offering
router.get(
  '/:courseOfferingId/report/me',
  requireCourseOfferingRead(),
  asyncHandler(getStudentCourseReport)
);

// Teacher/Dean: class-wide performance report for a course offering
router.get(
  '/:courseOfferingId/report',
  requireCourseOfferingManage(),
  asyncHandler(getTeacherCourseReport)
);

export default router;
