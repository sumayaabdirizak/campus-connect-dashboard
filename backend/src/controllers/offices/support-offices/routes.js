import { Router } from 'express';
import { auth } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/requireRole.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';

import { listOffices } from './directory.js';
import { createThread, listMyThreads, getThread, createMessage } from './student.js';
import { getInbox, claimThread, updateStatus } from './staff.js';
import { createOffice, addStaff, listStaff } from './admin.js';

const router = Router();
router.use(auth);

// Directory
router.get('/', asyncHandler(listOffices));

// Student side
router.post('/:slug/threads', asyncHandler(createThread));
router.get('/threads/mine', asyncHandler(listMyThreads));
router.get('/threads/:id', asyncHandler(getThread));
router.post('/threads/:id/messages', asyncHandler(createMessage));

// Staff side
router.get('/:slug/inbox', asyncHandler(getInbox));
router.post('/threads/:id/claim', asyncHandler(claimThread));
router.patch('/threads/:id/status', asyncHandler(updateStatus));

// Admin CRUD + staff management
router.post('/', requireRole('SUPER_ADMIN', 'DEAN'), asyncHandler(createOffice));
router.post('/:id/staff', requireRole('SUPER_ADMIN', 'DEAN'), asyncHandler(addStaff));
router.get('/:id/staff', requireRole('SUPER_ADMIN', 'DEAN'), asyncHandler(listStaff));

export default router;
