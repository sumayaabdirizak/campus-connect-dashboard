import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getAdminAnalytics,
  listAdminFaculties,
  getAdminUserLogins,
  getAdminTeacherActivity,
  getAdminUpcomingDeadlines,
} from './adminAnalytics.controller.js';
import { getAdminAuditLogs, getAdminAuditStats, getAdminAuditActors } from './adminAuditLogs.controller.js';

const router = Router();

router.get(
  '/analytics',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(getAdminAnalytics)
);
router.get(
  '/faculties',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(listAdminFaculties)
);
router.get(
  '/reports/user-logins',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(getAdminUserLogins)
);
router.get(
  '/reports/teacher-activity',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(getAdminTeacherActivity)
);
router.get(
  '/reports/upcoming-deadlines',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(getAdminUpcomingDeadlines)
);
router.get('/audit-logs', requireRole('SUPER_ADMIN'), asyncHandler(getAdminAuditLogs));
router.get('/audit-logs/stats', requireRole('SUPER_ADMIN'), asyncHandler(getAdminAuditStats));
router.get('/audit-logs/actors', requireRole('SUPER_ADMIN'), asyncHandler(getAdminAuditActors));

export default router;
