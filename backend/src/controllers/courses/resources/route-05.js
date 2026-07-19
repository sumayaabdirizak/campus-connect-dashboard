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
  router.get('/:courseOfferingId', requireCourseOfferingRead(), asyncHandler(async (req, res) => {
    const id = req.courseOffering.id;
  
    const resources = await prisma.resource.findMany({
      where: {
        OR: [
          { courseOfferingId: id },
          { courseOfferingId: null, courseId: id }
        ]
      },
      include: { teacher: { select: { id: true, full_name: true } } },
      orderBy: [{ moduleId: 'asc' }, { position: 'asc' }, { created_at: 'desc' }],
    });
  
    res.json(resources);
  }));
}
