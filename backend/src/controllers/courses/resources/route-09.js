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

import { resourceKeyFromUrl, verifyContentMatchesExtension, uploadExtensionFilter, enforceUploadContentSafety, RESOURCE_STORAGE_PREFIX } from './helpers.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.get(
    '/:resourceId/download', // Authorize against the owning offering — without this, any logged-in user
    // could stream/download any file by guessing its numeric id (IDOR). This is
    // also the streaming source for uploaded video/audio, so it's a hot path.
    requireResourceRead(),
    asyncHandler(async (req, res) => {
      const id = parseInt(req.params.resourceId, 10);
      const resource = await prisma.resource.findUnique({ where: { id } });
      if (!resource) return res.status(404).json({ message: 'Not found' });
  
      const key = resourceKeyFromUrl(resource.url);
      if (!key) return res.status(404).json({ message: 'Not a downloadable resource' });
  
      const downloadName = resource.originalName ?? path.basename(key);
      return sendStoredFile(res, key, {
        legacyPrefix: RESOURCE_STORAGE_PREFIX,
        downloadName,
        contentType: resource.mimeType || undefined,
      });
    })
  );
}
