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
  router.post('/:courseOfferingId/modules', requireCourseOfferingManage(), asyncHandler(async (req, res) => {
    const courseOfferingId = req.courseOffering.id;
    const { title, description, publishedAt } = req.body ?? {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'title is required' });
    }
    const last = await prisma.courseModule.findFirst({
      where: { courseOfferingId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const m = await prisma.courseModule.create({
      data: {
        courseOfferingId,
        title: String(title).trim(),
        description: description ?? null,
        position: (last?.position ?? -1) + 1,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });
    res.status(201).json(m);
  }));
}
