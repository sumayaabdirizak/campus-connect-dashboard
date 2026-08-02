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
import { assertActiveResourceType } from '../../../features/resources/resourceTypeOptions.js';

/** @param {import('express').Router} router */
export function register(router) {
  router.patch('/:resourceId', requireResourceManage(), asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    const { title, type, url, description, is_draft, status, moduleId, position } = req.body;
    // Validate URL only when the field is actually being changed — PATCHes
    // that don't touch `url` should keep working.
    if (url !== undefined && url !== null) {
      assertSafeExternalUrl(url, 'url');
    }
    if (type !== undefined && type !== null) {
      const typeOk = await assertActiveResourceType(type);
      if (!typeOk.ok) return res.status(400).json({ message: typeOk.message });
    }

    const resource = await prisma.resource.update({
      where: { id: parseInt(resourceId) },
      data: {
        ...(title && { title }),
        ...(type && { type }),
        ...(url && { url }),
        ...(description !== undefined && { description }),
        ...(typeof is_draft === 'boolean' && { is_draft }),
        ...(status && { status }),
        ...(moduleId !== undefined && { moduleId: moduleId === null ? null : Number(moduleId) }),
        ...(Number.isInteger(position) && { position }),
      },
      include: { teacher: { select: { id: true, full_name: true } } },
    });
    res.json(resource);
  }));
}
