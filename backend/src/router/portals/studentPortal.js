import { Router } from 'express';
import { requireRole } from "../../middleware/requireRole.js";
import {
  getMyCourses,
  getCourseDetail,
  getSemesterHistory,
} from '../../controllers/portals/studentPortal.controller.js';

const router = Router();
router.use(requireRole("STUDENT"));

router.get('/my-courses', getMyCourses);
router.get('/semester-history', getSemesterHistory);
router.get('/courses/:offeringId', getCourseDetail);

export default router;
