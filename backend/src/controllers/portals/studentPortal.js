import { Router } from 'express';
import { auth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { getMyCourses, getCourseDetail } from './studentPortal.controller.js';

const router = Router();
router.use(auth, requireRole("STUDENT"));

router.get('/my-courses', getMyCourses);
router.get('/courses/:offeringId', getCourseDetail);

export default router;
