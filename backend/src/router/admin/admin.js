import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getAdminAnalytics,
  listAdminFaculties,
  getAdminUserLogins,
  getAdminTeacherActivity,
  getAdminUpcomingDeadlines,
} from '../../controllers/admin/adminAnalytics.controller.js';
import { getAdminAuditLogs, getAdminAuditStats, getAdminAuditActors } from '../../controllers/admin/adminAuditLogs.controller.js';
import universityAisRouter from './universityAis.routes.js';

const router = Router();

router.get(
  '/analytics',
  requireRole('SUPER_ADMIN'),
  asyncHandler(getAdminAnalytics)
);
router.get(
  '/faculties',
  requireRole('SUPER_ADMIN'),
  asyncHandler(listAdminFaculties)
);
router.get(
  '/reports/user-logins',
  requireRole('SUPER_ADMIN'),
  asyncHandler(getAdminUserLogins)
);
router.get(
  '/reports/teacher-activity',
  requireRole('SUPER_ADMIN'),
  asyncHandler(getAdminTeacherActivity)
);
router.get(
  '/reports/upcoming-deadlines',
  requireRole('SUPER_ADMIN'),
  asyncHandler(getAdminUpcomingDeadlines)
);
router.get('/audit-logs', requireRole('SUPER_ADMIN'), asyncHandler(getAdminAuditLogs));
router.get('/audit-logs/stats', requireRole('SUPER_ADMIN'), asyncHandler(getAdminAuditStats));
router.get('/audit-logs/actors', requireRole('SUPER_ADMIN'), asyncHandler(getAdminAuditActors));

router.use('/university-ais', universityAisRouter);

export default router;
