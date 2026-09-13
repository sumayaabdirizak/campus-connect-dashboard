import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createRole, listRoles } from '../../controllers/rbac/roles.controller.js';

const router = Router();

router.get('/', requireRole('SUPER_ADMIN'), asyncHandler(listRoles));
router.post('/', requireRole('SUPER_ADMIN'), asyncHandler(createRole));

export default router;
