import { Router } from 'express';
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { getMyAssignments } from './lecturerPortal.controller.js';
import { getMyCourses, getCourseDetail } from './teacherCourse.controller.js';

const router = Router();
router.use(auth, requireRole("TEACHER"));

router.get('/my-assignments', getMyAssignments);
router.get('/courses', getMyCourses);
router.get('/courses/:offeringId', getCourseDetail);

export default router;
