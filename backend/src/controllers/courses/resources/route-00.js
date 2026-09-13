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
  router.post('/reorder', requireResourceReorderManage(), asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) return res.json({ updated: 0 });
    await prisma.$transaction(
      items.map((it) =>
        prisma.resource.update({
          where: { id: Number(it.id) },
          data: {
            moduleId: it.moduleId == null ? null : Number(it.moduleId),
            position: Number(it.position) || 0,
          },
        })
      )
    );
    res.json({ updated: items.length });
  }));
}
