import { Router } from 'express';
import { requireRole } from "../../middleware/requireRole.js";
import { getMyCourses, getCourseDetail } from './studentPortal.controller.js';

const router = Router();
router.use(requireRole("STUDENT"));

router.get('/my-courses', getMyCourses);
router.get('/courses/:offeringId', getCourseDetail);

export default router;
