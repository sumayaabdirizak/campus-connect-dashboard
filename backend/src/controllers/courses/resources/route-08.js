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
  router.delete('/:resourceId', requireResourceManage(), asyncHandler(async (req, res) => {
    const id = parseInt(req.params.resourceId);
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Resource not found' });
    if (existing) {
      try {
        if (existing.originalName) {
          const key = resourceKeyFromUrl(existing.url);
          if (key) await deleteStoredObject(key, RESOURCE_STORAGE_PREFIX);
        }
      } catch { /* ignore */ }
    }
    await prisma.resource.delete({ where: { id } });
    res.json({ success: true });
  }));
}
