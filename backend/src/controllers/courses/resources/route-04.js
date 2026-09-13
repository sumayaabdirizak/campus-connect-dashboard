import { Router } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { prisma } from '../../../db/prisma.js';
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  requireCourseOfferingRead,
  requireCourseOfferingManage,
  requireResourceManage,
  requireResourceRead,
  requireModuleManage,
  requireResourceReorderManage,
  requireModuleReorderManage,
} from "../../../middleware/courseOfferingRbac.js";
import { assertSafeExternalUrl } from "../../../utils/safeUrl.js";
import { uploadRateLimit } from "../../../middleware/perUserRateLimit.js";
import {
  commitUploadedFile,
  deleteStoredObject,
  sendStoredFile,
  normalizeStorageKey,
} from "../../../storage/objectStorage.js";

import { resourceKeyFromUrl, verifyContentMatchesExtension, uploadExtensionFilter, enforceUploadContentSafety } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.delete('/modules/:moduleId', requireModuleManage(), asyncHandler(async (req, res) => {
    const id = parseInt(req.params.moduleId, 10);
    // Resources with this moduleId have onDelete: SetNull, so they move to the
    // "Ungrouped" bucket instead of being deleted.
    await prisma.courseModule.delete({ where: { id } });
    res.json({ success: true });
  }));
}
