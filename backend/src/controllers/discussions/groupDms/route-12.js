/**
 * Group DMs (3–10 members, no 1:1). Mounted at `/api/discussions`.
 */

import { asyncHandler } from '../../../utils/asyncHandler.js';
import { uploadRateLimit } from '../../../middleware/perUserRateLimit.js';
import { groupDmIconUploadMw, removeGroupDmIcon, uploadGroupDmIcon } from './uploadIcon.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.post(
    '/group-dms/:groupDmId/icon',
    uploadRateLimit,
    groupDmIconUploadMw,
    asyncHandler(uploadGroupDmIcon)
  );
  router.delete('/group-dms/:groupDmId/icon', asyncHandler(removeGroupDmIcon));
}
