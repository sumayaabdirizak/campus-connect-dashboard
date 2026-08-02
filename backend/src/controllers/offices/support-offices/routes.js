import { Router } from 'express';
import { auth } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/requireRole.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

import { listOffices } from './directory.js';
import { createThread, listMyThreads, getThread, createMessage } from './student.js';
import { getInbox, claimThread, reassignThread, updateStatus } from './staff.js';
import { createOffice, updateOffice, addStaff, listStaff, removeStaff } from './admin.js';
import { ensureDefaults } from './ensureDefaults.js';
import { getOversightOfficeDm, startOrContinueOversightOfficeDm } from './oversightDm.js';

const router = Router();
router.use(auth);

// Directory
router.get('/', asyncHandler(listOffices));
router.post(
  '/ensure-defaults',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(ensureDefaults)
);

// Oversight DM (Academic Office ↔ desk) — before /:slug/threads
router.get(
  '/:slug/dm',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(getOversightOfficeDm)
);
router.post(
  '/:slug/dm',
  requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE'),
  asyncHandler(startOrContinueOversightOfficeDm)
);

// Student side
router.post('/:slug/threads', asyncHandler(createThread));
router.get('/threads/mine', asyncHandler(listMyThreads));
router.get('/threads/:id', asyncHandler(getThread));
router.post('/threads/:id/messages', asyncHandler(createMessage));

// Staff side
router.get('/:slug/inbox', asyncHandler(getInbox));
router.post('/threads/:id/claim', asyncHandler(claimThread));
router.patch('/threads/:id/assign', asyncHandler(reassignThread));
router.patch('/threads/:id/status', asyncHandler(updateStatus));

// Office create/update (platform admins). Staff roster: admins or office managers.
router.post('/', requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE', 'DEAN'), asyncHandler(createOffice));
router.patch('/:id', requireRole('SUPER_ADMIN', 'ACADEMIC_OFFICE', 'DEAN'), asyncHandler(updateOffice));
router.post('/:id/staff', asyncHandler(addStaff));
router.get('/:id/staff', asyncHandler(listStaff));
router.delete('/:id/staff/:userId', asyncHandler(removeStaff));

export default router;
