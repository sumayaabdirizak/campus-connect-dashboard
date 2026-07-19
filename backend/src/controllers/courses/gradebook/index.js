import { Router } from 'express';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import {
  requireCourseOfferingManage,
  requireCourseOfferingRead,
} from '../../../middleware/courseOfferingRbac.js';
import { getStudentGrades } from './student.js';
import { getTeacherGradebook } from './teacher.js';

const router = Router();

// Student: view own grades for a course offering
router.get('/:courseOfferingId/me', requireCourseOfferingRead(), asyncHandler(getStudentGrades));

// Teacher/Dean: full class gradebook
router.get('/:courseOfferingId', requireCourseOfferingManage(), asyncHandler(getTeacherGradebook));

export default router;
