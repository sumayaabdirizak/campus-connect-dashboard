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
  router.get('/:resourceId/my-progress', requireResourceRead(), asyncHandler(async (req, res) => {
    if (req.user?.role !== 'STUDENT') return res.json(null);
    const resourceId = parseInt(req.params.resourceId, 10);
    const studentId = req.user.id;
    const view = await prisma.resourceView.findUnique({
      where: { resourceId_studentId: { resourceId, studentId } },
      select: {
        watchedSeconds: true,
        durationSeconds: true,
        lastPositionSeconds: true,
        completed: true,
      },
    });
    res.json(view ?? null);
  }));
}
