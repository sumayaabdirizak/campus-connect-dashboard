import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getAdminAnalytics, listAdminFaculties } from './adminAnalytics.controller.js';
import { getAdminAuditLogs, getAdminAuditStats, getAdminAuditActors } from './adminAuditLogs.controller.js';

const router = Router();

router.use(requireRole('SUPER_ADMIN'));

router.get('/analytics', asyncHandler(getAdminAnalytics));
router.get('/faculties', asyncHandler(listAdminFaculties));
router.get('/audit-logs', asyncHandler(getAdminAuditLogs));
router.get('/audit-logs/stats', asyncHandler(getAdminAuditStats));
router.get('/audit-logs/actors', asyncHandler(getAdminAuditActors));

export default router;
